/**
 * ResolveAI Classification Engine
 * ---------------------------------
 * Deliberately rule-based rather than calling an external AI API. This
 * satisfies the hard requirement that the system must keep working if
 * an external AI service is unavailable — there's simply nothing to
 * fail over. It's also fully explainable, which the priority engine
 * depends on (no black-box scoring allowed).
 *
 * Swap-in point for later: if you later want to call a real LLM for
 * classification, keep this file as the fallback and wrap both behind
 * `classifyComplaint()` so callers never need to change.
 */

const CATEGORY_RULES = [
  {
    category: 'Payment',
    keywords: [
      'payment', 'charged', 'charge', 'overcharged', 'deducted', 'debited', 'debit',
      'transaction failed', 'transaction declined', 'billed', 'billing', 'double charged',
      'double payment', 'wrong amount', 'extra charge', 'paid twice', 'upi failed', 'card declined'
    ],
    department: 'Finance'
  },
  {
    category: 'Refund',
    keywords: [
      'refund', 'refunded', 'not refunded', 'refund not received', 'refund pending',
      'money back', 'reimburse', 'reimbursement', 'return my money', 'cashback',
      "haven't received my refund", 'still waiting for refund', 'no refund'
    ],
    department: 'Finance'
  },
  {
    category: 'Delivery',
    keywords: [
      'delivery', 'delivered', 'not delivered', 'never arrived', 'not arrived', 'order not received',
      'shipment', 'shipping', 'courier', 'package', 'parcel', 'tracking', 'in transit', 'lost in transit',
      'delayed', 'late delivery', 'delivery delayed', 'wrong address', 'stuck at'
    ],
    department: 'Logistics'
  },
  {
    category: 'Product',
    keywords: [
      'defective', 'broken', 'broke', 'damaged', 'damage', 'cracked', 'crack', 'shattered',
      'scratched', 'scratch', 'dented', 'faulty', 'malfunction', 'stopped working', 'not switching on',
      'dead on arrival', 'wrong item', 'wrong product', 'missing parts', 'missing item', 'poor quality',
      'bad quality', 'quality', 'not as described', 'expired', 'screen', 'display'
    ],
    department: 'Quality Assurance'
  },
  {
    category: 'Technical',
    keywords: [
      'crash', 'crashes', 'crashed', 'bug', 'error', 'not working', 'doesn\'t work', 'glitch',
      'app freezes', 'app not opening', 'app not loading', 'page not loading', 'website down',
      'server error', 'technical', 'otp not received', 'code not received', 'not syncing',
      'sync', 'very slow', 'lagging', 'update failed', 'feature not working'
    ],
    department: 'Tech Support'
  },
  {
    category: 'Account',
    keywords: [
      'account', 'password', 'reset password', 'forgot password', 'locked out', 'locked',
      'cannot log in', "can't log in", 'unable to login', 'sign in', 'sign-in', 'profile',
      'access denied', 'verification', 'verify', 'kyc', 'two-factor', '2fa', 'account suspended',
      'account deactivated', 'account hacked', 'unauthorized access'
    ],
    department: 'Customer Success'
  },
  {
    category: 'Subscription',
    keywords: [
      'subscription', 'renewal', 'renewed', 'auto-renew', 'auto renewed', 'cancel my plan',
      'cancel subscription', 'charged after cancel', 'membership', 'free trial', 'trial',
      'downgrade', 'upgrade plan', 'billing cycle', 'plan'
    ],
    department: 'Finance'
  }
]

const HIGH_SEVERITY_SIGNALS = [
  'urgent', 'urgently', 'immediately', 'asap', 'emergency', 'legal', 'lawyer', 'consumer court',
  'fraud', 'fraudulent', 'unauthorized', 'scam', 'money deducted', 'money lost', 'lost my',
  'not received', 'never received', 'still not fixed', 'still not resolved', 'still waiting',
  'second time', 'third time', 'again and again', 'repeatedly', 'multiple times',
  'completely unusable', 'cannot use', "can't use", 'not usable', 'no response', 'ignored',
  'worst', 'unacceptable', 'escalate', 'harassment', 'safety', 'injury'
]
const MONEY_PATTERN = /(?:₹|rs\.?|inr|\$)\s?[\d,]+/i

/**
 * @param {string} description
 * @returns {{
 *   category: string,
 *   department: string,
 *   severity: number,          // 1-5
 *   customerImpact: 'Low'|'Medium'|'High',
 *   confidence: number,        // 0-100
 *   explanation: string
 * }}
 */
export function classifyComplaint(description = '') {
  const text = (description || '').toLowerCase().trim()

  if (!text) {
    return {
      category: 'Other',
      department: 'General Support',
      severity: 2,
      customerImpact: 'Low',
      confidence: 30,
      explanation: 'No description provided — defaulted to a low-confidence general classification. Please ask an agent to re-categorize.'
    }
  }

  // 1. Category match — first rule whose keyword appears wins, count total hits for confidence
  let matched = null
  let hitCount = 0
  for (const rule of CATEGORY_RULES) {
    const hits = rule.keywords.filter(k => text.includes(k))
    if (hits.length > 0 && !matched) {
      matched = rule
      hitCount = hits.length
    } else if (hits.length > 0 && matched === rule) {
      hitCount += hits.length
    }
  }
  const category = matched?.category || 'Other'
  const department = matched?.department || 'General Support'

  // 2. Severity: base 2, +1 for each high-severity signal (capped at 5), +1 if money amount mentioned
  let severity = 2
  const signalHits = HIGH_SEVERITY_SIGNALS.filter(s => text.includes(s)).length
  severity += signalHits
  if (MONEY_PATTERN.test(text)) severity += 1
  if (category === 'Payment' || category === 'Refund') severity += 1
  severity = Math.max(1, Math.min(5, severity))

  // 3. Customer impact: driven by severity + explicit money/financial-loss language
  let customerImpact = 'Low'
  if (severity >= 4 || MONEY_PATTERN.test(text)) customerImpact = 'High'
  else if (severity === 3) customerImpact = 'Medium'

  // 4. Confidence: more keyword hits + a matched category = more confident
  let confidence = matched ? 60 + Math.min(hitCount * 12, 35) : 35
  confidence = Math.min(97, confidence)

  // 5. Explanation — human-readable, shown verbatim on the complaint detail page
  const reasons = []
  if (matched) reasons.push(`matched "${category}" keywords in the description`)
  if (signalHits > 0) reasons.push(`detected ${signalHits} urgency signal${signalHits > 1 ? 's' : ''}`)
  if (MONEY_PATTERN.test(text)) reasons.push('a monetary amount was mentioned')
  const explanation = reasons.length
    ? `Classified as ${category} because the system ${reasons.join(', ')}.`
    : `No strong category signals found — defaulted to ${category} with low confidence.`

  return { category, department, severity, customerImpact, confidence, explanation }
}
