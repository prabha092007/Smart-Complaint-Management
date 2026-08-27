/**
 * Priority Engine — transparent 0-100 score, never a black box.
 * Weighting (as specified):
 *   Severity              = up to 30
 *   Customer Impact       = up to 25
 *   SLA Urgency           = up to 25
 *   Complaint Age         = up to 10
 *   Previous Escalation / Reopened = up to 10
 *
 * Every point awarded is returned with a human-readable reason so the
 * complaint detail page can show "why" a score was given.
 */

const IMPACT_POINTS = { Low: 8, Medium: 16, High: 25 }

/**
 * @param {object} c - complaint-like object
 *   { severity, customerImpact, slaDeadline, createdAt, prevEscalated, reopenCount }
 * @returns {{ score:number, level:'Low'|'Medium'|'High'|'Critical', reasons: {label:string, points:number}[] }}
 */
export function calculatePriority(c) {
  const reasons = []
  const now = Date.now()

  // Severity: 1-5 scale -> up to 30 points
  const sevPoints = Math.round((c.severity / 5) * 30)
  reasons.push({ label: `Severity ${c.severity}/5`, points: sevPoints })

  // Customer impact -> up to 25 points
  const impactPoints = IMPACT_POINTS[c.customerImpact] ?? 16
  reasons.push({ label: `${c.customerImpact} customer impact`, points: impactPoints })

  // SLA urgency -> up to 25 points, scaled by how little time is left
  let slaPoints = 0
  if (c.slaDeadline) {
    const total = new Date(c.slaDeadline).getTime() - new Date(c.createdAt).getTime()
    const remaining = new Date(c.slaDeadline).getTime() - now
    const pctRemaining = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0
    if (remaining <= 0) {
      slaPoints = 25
      reasons.push({ label: 'SLA already breached', points: slaPoints })
    } else if (pctRemaining <= 0.2) {
      slaPoints = 20
      reasons.push({ label: 'SLA approaching (<20% time left)', points: slaPoints })
    } else if (pctRemaining <= 0.5) {
      slaPoints = 10
      reasons.push({ label: 'SLA urgency building', points: slaPoints })
    }
  }

  // Complaint age -> up to 10 points, capped at 72h for full points
  const ageHours = (now - new Date(c.createdAt).getTime()) / 3600000
  const agePoints = Math.round(Math.min(1, ageHours / 72) * 10)
  if (agePoints > 0) reasons.push({ label: `Open for ${Math.round(ageHours)}h`, points: agePoints })

  // Previous escalation / reopened -> up to 10 points
  let escPoints = 0
  if (c.prevEscalated) escPoints += 6
  if (c.reopenCount > 0) escPoints += Math.min(4, c.reopenCount * 4)
  escPoints = Math.min(10, escPoints)
  if (escPoints > 0) {
    const label = c.reopenCount > 0 ? `Reopened ${c.reopenCount}x` : 'Previously escalated'
    reasons.push({ label, points: escPoints })
  }

  const score = Math.min(100, sevPoints + impactPoints + slaPoints + agePoints + escPoints)

  let level = 'Low'
  if (score > 80) level = 'Critical'
  else if (score > 60) level = 'High'
  else if (score > 30) level = 'Medium'

  return { score, level, reasons }
}
