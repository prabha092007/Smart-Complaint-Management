/**
 * Lightweight duplicate detection — Jaccard token overlap between a new
 * complaint description and the customer's recent complaints. Pure and
 * dependency-free so it can also be exercised by the Test Cases page.
 */
function tokens(s) {
  return new Set((s || '').toLowerCase().match(/[a-z0-9]{3,}/g) || [])
}

export function similarity(a, b) {
  const ta = tokens(a)
  const tb = tokens(b)
  if (!ta.size || !tb.size) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return inter / (ta.size + tb.size - inter)
}

/**
 * @param {string} description
 * @param {{ticket_number?:string,title?:string,description?:string}[]} existing
 * @param {number} threshold
 * @returns {{ complaint: object, score: number } | null}
 */
export function findPossibleDuplicate(description, existing = [], threshold = 0.5) {
  let best = null
  let bestScore = 0
  for (const c of existing) {
    const s = similarity(description, `${c.title ?? ''} ${c.description ?? ''}`)
    if (s > bestScore) { bestScore = s; best = c }
  }
  return bestScore >= threshold ? { complaint: best, score: Math.round(bestScore * 100) } : null
}
