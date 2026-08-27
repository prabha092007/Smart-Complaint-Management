import { supabase } from '../lib/supabaseClient'
import { slaState } from '../engines/slaEngine'

export async function getAnalytics() {
  const { data: complaints } = await supabase
    .from('complaints')
    .select('*, categories:category_id(name), departments:assigned_department_id(name)')

  const all = complaints ?? []
  const total = all.length
  const resolved = all.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED')
  const breached = all.filter(c => slaState(c) === 'BREACHED')
  const approaching = all.filter(c => slaState(c) === 'APPROACHING')
  const reopened = all.filter(c => (c.reopen_count ?? 0) > 0)
  const escalated = all.filter(c => (c.escalation_level ?? 0) > 0)

  const byCategory = groupCount(all, c => c.categories?.name ?? 'Uncategorized')
  const byPriority = groupCount(all, c => c.priority_level ?? 'Unscored')
  const byStatus = groupCount(all, c => c.status)
  const byDepartment = groupCount(all, c => c.departments?.name ?? 'Unassigned')

  const resTimes = resolved
    .filter(c => c.resolved_at)
    .map(c => (new Date(c.resolved_at) - new Date(c.created_at)) / 3600000)
  const avgResolutionHours = resTimes.length ? resTimes.reduce((a, b) => a + b, 0) / resTimes.length : 0

  return {
    total,
    resolvedCount: resolved.length,
    resolutionRate: total ? Math.round((resolved.length / total) * 100) : 0,
    slaComplianceRate: total ? Math.round(((total - breached.length) / total) * 100) : 100,
    breachRate: total ? Math.round((breached.length / total) * 100) : 0,
    escalationRate: total ? Math.round((escalated.length / total) * 100) : 0,
    reopenRate: total ? Math.round((reopened.length / total) * 100) : 0,
    avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
    approachingCount: approaching.length,
    breachedCount: breached.length,
    byCategory, byPriority, byStatus, byDepartment
  }
}

const OPEN_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'REOPENED', 'ESCALATED']

/** Per-department open workload + SLA-risk counts, for the sidebar chips and the workload panel. */
export async function getDepartmentWorkload() {
  const [{ data: depts }, { data: complaints }] = await Promise.all([
    supabase.from('departments').select('*').order('name'),
    supabase.from('complaints').select('assigned_department_id, status, sla_deadline, created_at')
  ])
  const all = complaints ?? []
  return (depts ?? []).map(d => {
    const mine = all.filter(c => c.assigned_department_id === d.id)
    const open = mine.filter(c => OPEN_STATUSES.includes(c.status))
    const atRisk = open.filter(c => ['APPROACHING', 'BREACHED'].includes(slaState(c)))
    return {
      id: d.id,
      name: d.name,
      isAvailable: d.is_available !== false,
      open: open.length,
      total: mine.length,
      atRisk: atRisk.length
    }
  })
}

function groupCount(arr, keyFn) {
  const map = {}
  for (const item of arr) {
    const key = keyFn(item)
    map[key] = (map[key] || 0) + 1
  }
  return Object.entries(map).map(([name, value]) => ({ name, value }))
}
