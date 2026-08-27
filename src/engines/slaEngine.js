/**
 * SLA + Escalation Engine
 * ------------------------
 * IMPORTANT: escalation is driven by SLA time-remaining, NOT by
 * priority score. A low-priority complaint 15 minutes from breach
 * must outrank a high-priority complaint with 8 hours left. Priority
 * and SLA urgency are calculated independently and only combined
 * inside priorityEngine's own "SLA urgency" sub-score — the escalation
 * decision itself never reads priority_score at all.
 */

export const SLA_HOURS = { Low: 48, Medium: 24, High: 12, Critical: 4 }

export function calculateSlaDeadline(createdAt, priorityLevel) {
  const hours = SLA_HOURS[priorityLevel] ?? 24
  return new Date(new Date(createdAt).getTime() + hours * 3600000).toISOString()
}

/**
 * @returns {'SAFE'|'APPROACHING'|'BREACHED'|'RESOLVED'}
 */
export function slaState(complaint) {
  if (complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') return 'RESOLVED'
  if (!complaint.sla_deadline) return 'SAFE'
  const remaining = new Date(complaint.sla_deadline).getTime() - Date.now()
  if (remaining <= 0) return 'BREACHED'
  const total = new Date(complaint.sla_deadline).getTime() - new Date(complaint.created_at).getTime()
  const pct = total > 0 ? remaining / total : 1
  if (pct <= 0.2) return 'APPROACHING'
  return 'SAFE'
}

export function pctRemaining(complaint) {
  if (!complaint.sla_deadline) return 100
  const total = new Date(complaint.sla_deadline).getTime() - new Date(complaint.created_at).getTime()
  const remaining = new Date(complaint.sla_deadline).getTime() - Date.now()
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, (remaining / total) * 100))
}

export function formatRemaining(complaint) {
  if (complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') return 'Resolved'
  const ms = new Date(complaint.sla_deadline).getTime() - Date.now()
  if (ms <= 0) return `Breached ${formatDuration(-ms)} ago`
  return `${formatDuration(ms)} remaining`
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * Determines the escalation level a complaint SHOULD be at right now,
 * based purely on SLA state + severity/impact/history — independent
 * of the complaint's priority score.
 * @returns {0|1|2|3}
 */
export function requiredEscalationLevel(complaint) {
  const state = slaState(complaint)
  if (state === 'RESOLVED') return 0
  if (state === 'SAFE') return 0

  if (state === 'APPROACHING') {
    // Level 1: front-line agent needs to act now
    return 1
  }
  if (state === 'BREACHED') {
    // Level 2 by default once breached; bump to Level 3 for repeat/severe cases
    const severe = complaint.severity >= 4 || complaint.customer_impact === 'High'
    const repeat = complaint.reopen_count > 0 || complaint.escalation_level >= 2
    return severe || repeat ? 3 : 2
  }
  return 0
}

export const ESCALATION_LABEL = { 0: 'None', 1: 'Support Agent', 2: 'Department Manager', 3: 'Senior Manager / Admin' }
