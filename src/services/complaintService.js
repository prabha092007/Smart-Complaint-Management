import { supabase } from '../lib/supabaseClient'
import { classifyComplaint } from '../lib/classifier'
import { calculatePriority } from '../engines/priorityEngine'
import { calculateSlaDeadline, requiredEscalationLevel, slaState } from '../engines/slaEngine'
import { chooseDepartment } from '../lib/routing'
import { findPossibleDuplicate } from '../lib/duplicateCheck'
import { PROOF_BUCKET, proofExt, proofPrefix, validateProofFiles } from '../lib/proof'

const OPEN_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'REOPENED', 'ESCALATED']

/** Upload a customer's proof images to Storage; returns their public URLs. */
async function uploadProofImages(customerId, files) {
  const prefix = proofPrefix(customerId)
  const urls = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const path = `${prefix}/proof-${i + 1}.${proofExt(file.type)}`
    const { error } = await supabase.storage
      .from(PROOF_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw error
    urls.push(supabase.storage.from(PROOF_BUCKET).getPublicUrl(path).data.publicUrl)
  }
  return urls
}

/** Warn the customer if this description looks like one of their recent complaints. */
export async function checkDuplicate(customerId, description) {
  if (!customerId || !description || description.trim().length < 15) return null
  const { data } = await supabase
    .from('complaints')
    .select('id, ticket_number, title, description, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(20)
  return findPossibleDuplicate(description, data ?? [])
}

async function nextTicketNumber() {
  const { count } = await supabase.from('complaints').select('id', { count: 'exact', head: true })
  return `RA-${1000 + (count ?? 0) + 1}`
}

async function logHistory(complaintId, event, detail = {}) {
  await supabase.from('complaint_history').insert({ complaint_id: complaintId, event, detail })
}

/** Create a complaint: classify -> score priority -> assign department -> set SLA -> insert */
export async function submitComplaint({ customerId, title, description, proofFiles = [] }) {
  const proofError = validateProofFiles(proofFiles)
  if (proofError) return { data: null, error: { message: proofError } }

  const ai = classifyComplaint(description)

  const { data: category } = await supabase
    .from('categories').select('id, name, default_department_id').eq('name', ai.category).single()

  // Resolve department by the name the classifier picked; fall back to the
  // category's default department if that lookup somehow misses.
  const { data: allDepts } = await supabase.from('departments').select('id, name, is_available')
  const byName = (allDepts ?? []).find(d => d.name === ai.department)
  const byDefault = (allDepts ?? []).find(d => d.id === category?.default_department_id)
  const preferred = byName || byDefault || null

  // Open-workload per department, so an offline department reroutes to the
  // lightest-loaded available team rather than dropping the complaint.
  const { data: openRows } = await supabase
    .from('complaints').select('assigned_department_id, status')
  const openCountByDeptId = {}
  for (const r of openRows ?? []) {
    if (OPEN_STATUSES.includes(r.status) && r.assigned_department_id) {
      openCountByDeptId[r.assigned_department_id] = (openCountByDeptId[r.assigned_department_id] || 0) + 1
    }
  }
  const routed = chooseDepartment(preferred, allDepts ?? [], openCountByDeptId)
  const resolvedDept = routed ? { id: routed.id, name: routed.name } : null

  // Duplicate check against this customer's recent complaints.
  const dup = await checkDuplicate(customerId, description)

  // Upload proof images first, so the insert either has all URLs or fails cleanly.
  let proof_urls = []
  if (proofFiles.length) {
    try {
      proof_urls = await uploadProofImages(customerId, proofFiles)
    } catch (e) {
      return { data: null, error: { message: `Proof image upload failed: ${e.message || e}` } }
    }
  }

  const createdAt = new Date().toISOString()
  const priority = calculatePriority({
    severity: ai.severity,
    customerImpact: ai.customerImpact,
    slaDeadline: null, // computed after we know priority level
    createdAt,
    prevEscalated: false,
    reopenCount: 0
  })
  const slaDeadline = calculateSlaDeadline(createdAt, priority.level)
  // Recompute priority now that we know the real SLA deadline (SLA-urgency sub-score depends on it)
  const finalPriority = calculatePriority({
    severity: ai.severity,
    customerImpact: ai.customerImpact,
    slaDeadline,
    createdAt,
    prevEscalated: false,
    reopenCount: 0
  })

  const ticket_number = await nextTicketNumber()

  const { data, error } = await supabase.from('complaints').insert({
    ticket_number,
    customer_id: customerId,
    title,
    description,
    category_id: category?.id ?? null,
    severity: ai.severity,
    customer_impact: ai.customerImpact,
    priority_score: finalPriority.score,
    priority_level: finalPriority.level,
    priority_reasons: finalPriority.reasons,
    ai_confidence: ai.confidence,
    ai_explanation: ai.explanation,
    proof_urls,
    assigned_department_id: resolvedDept?.id ?? null,
    status: 'NEW',
    sla_hours: (slaDeadline && createdAt) ? (new Date(slaDeadline) - new Date(createdAt)) / 3600000 : null,
    sla_deadline: slaDeadline,
    created_at: createdAt
  }).select().single()

  if (!error && data) {
    await logHistory(data.id, 'created', { title })
    await logHistory(data.id, 'ai_classified', ai)
    await logHistory(data.id, 'assigned', { department: resolvedDept?.name })
    if (routed?.rerouted) {
      await logHistory(data.id, 'reassigned', { from: routed.reroutedFrom, to: routed.name, reason: 'department offline' })
    }
    if (dup) {
      await logHistory(data.id, 'duplicate_flagged', { original: dup.complaint.ticket_number, score: dup.score })
    }
    if (proof_urls.length) {
      await logHistory(data.id, 'proof_attached', { count: proof_urls.length })
    }
  }

  return { data, error, routed, duplicate: dup }
}

export async function listComplaints({ role, userId, filters = {} } = {}) {
  let query = supabase.from('complaints').select('*, categories:category_id(name), departments:assigned_department_id(name)')

  if (role === 'customer') query = query.eq('customer_id', userId)
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.category && filters.category !== 'all') query = query.eq('category_id', filters.category)
  if (filters.department && filters.department !== 'all') query = query.eq('assigned_department_id', filters.department)

  const { data, error } = await query.order('priority_score', { ascending: false })
  return { data: data ?? [], error }
}

export async function listDepartments() {
  const { data } = await supabase.from('departments').select('*').order('name')
  return data ?? []
}

export async function listEscalations() {
  const { data } = await supabase
    .from('escalations')
    .select('*, complaints:complaint_id(ticket_number, title, priority_level, status, departments:assigned_department_id(name))')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getComplaint(id) {
  const { data, error } = await supabase
    .from('complaints')
    .select('*, categories:category_id(name), departments:assigned_department_id(name)')
    .eq('id', id).single()
  return { data, error }
}

export async function getHistory(complaintId) {
  const { data } = await supabase.from('complaint_history').select('*').eq('complaint_id', complaintId).order('created_at')
  return data ?? []
}

export async function getComments(complaintId) {
  const { data } = await supabase
    .from('complaint_comments').select('*, profiles:author_id(full_name, role)')
    .eq('complaint_id', complaintId).order('created_at')
  return data ?? []
}

export async function addComment(complaintId, authorId, body) {
  const { error } = await supabase.from('complaint_comments').insert({ complaint_id: complaintId, author_id: authorId, body })
  if (!error) await logHistory(complaintId, 'comment_added', { authorId })
  return { error }
}

export async function updateStatus(complaintId, status) {
  const patch = { status, updated_at: new Date().toISOString() }
  if (status === 'RESOLVED') patch.resolved_at = new Date().toISOString()
  const { error } = await supabase.from('complaints').update(patch).eq('id', complaintId)
  if (!error) await logHistory(complaintId, 'status_changed', { status })
  return { error }
}

export async function reopenComplaint(complaintId, reason) {
  const { data: c } = await supabase.from('complaints').select('*').eq('id', complaintId).single()
  if (!c) return { error: 'not found' }

  const createdAt = c.created_at
  const newReopenCount = (c.reopen_count ?? 0) + 1
  const priority = calculatePriority({
    severity: c.severity,
    customerImpact: c.customer_impact,
    slaDeadline: c.sla_deadline,
    createdAt,
    prevEscalated: c.escalation_level > 0,
    reopenCount: newReopenCount
  })
  // Give reopened tickets a fresh, shorter SLA window based on the recalculated priority
  const newDeadline = calculateSlaDeadline(new Date().toISOString(), priority.level)

  const { error } = await supabase.from('complaints').update({
    status: 'REOPENED',
    reopen_count: newReopenCount,
    reopened_at: new Date().toISOString(),
    sla_deadline: newDeadline,
    priority_score: priority.score,
    priority_level: priority.level,
    priority_reasons: priority.reasons,
    updated_at: new Date().toISOString()
  }).eq('id', complaintId)

  if (!error) await logHistory(complaintId, 'reopened', { reason, reopen_count: newReopenCount })
  return { error }
}

/** Recalculates escalation level from live SLA state and creates an escalation record if needed. */
export async function checkAndEscalate(complaint) {
  const required = requiredEscalationLevel(complaint)
  if (required <= (complaint.escalation_level ?? 0)) return { escalated: false }

  const { error: escError } = await supabase.from('escalations').upsert(
    { complaint_id: complaint.id, level: required, reason: `SLA state: ${slaState(complaint)}` },
    { onConflict: 'complaint_id,level', ignoreDuplicates: true }
  )
  if (escError) return { escalated: false, error: escError }

  await supabase.from('complaints').update({
    escalation_level: required,
    status: complaint.status === 'RESOLVED' ? complaint.status : 'ESCALATED'
  }).eq('id', complaint.id)

  await logHistory(complaint.id, 'escalated', { level: required })
  return { escalated: true, level: required }
}

export async function reassignComplaint(complaintId, agentId) {
  const { error } = await supabase.from('complaints').update({ assigned_agent_id: agentId, status: 'ASSIGNED' }).eq('id', complaintId)
  if (!error) await logHistory(complaintId, 'reassigned', { agentId })
  return { error }
}
