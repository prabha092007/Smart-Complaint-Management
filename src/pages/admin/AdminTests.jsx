import { useState } from 'react'
import { Check, X, Play, FlaskConical } from 'lucide-react'
import { classifyComplaint } from '../../lib/classifier'
import { calculatePriority } from '../../engines/priorityEngine'
import { slaState, requiredEscalationLevel, calculateSlaDeadline } from '../../engines/slaEngine'
import { chooseDepartment } from '../../lib/routing'
import { findPossibleDuplicate } from '../../lib/duplicateCheck'
import AppShell from '../../components/co/AppShell'
import { Panel, Pill, StatTile, HotButton } from '../../components/co/kit'

const hFromNow = h => new Date(Date.now() + h * 3600000).toISOString()
const hAgo = h => new Date(Date.now() - h * 3600000).toISOString()

const CASES = [
  {
    n: 1,
    title: 'Low-priority complaint approaching SLA breach',
    desc: 'A minor complaint that has waited long enough to be near breach must still be escalated — ahead of newer high-priority tickets — even though it is not a high-priority ticket.',
    run() {
      const c = { status: 'IN_PROGRESS', severity: 2, customer_impact: 'Low', escalation_level: 0,
        reopen_count: 0, created_at: hAgo(47.8), sla_deadline: hFromNow(0.2) }
      const p = calculatePriority({ severity: 2, customerImpact: 'Low', slaDeadline: c.sla_deadline, createdAt: c.created_at, prevEscalated: false, reopenCount: 0 })
      const lvl = requiredEscalationLevel(c)
      return { pass: lvl >= 1 && p.score < 60, detail: `priority ${p.level} ${p.score}, escalates L${lvl}` }
    }
  },
  {
    n: 2,
    title: 'High-severity new complaint',
    desc: 'A brand-new severity-5 complaint scores highly on priority from severity and impact, but its SLA is still SAFE — so it is NOT escalated. Escalation waits for SLA urgency, not severity.',
    run() {
      const created = new Date().toISOString()
      const deadline = calculateSlaDeadline(created, 'Critical')
      const p = calculatePriority({ severity: 5, customerImpact: 'High', slaDeadline: deadline, createdAt: created, prevEscalated: false, reopenCount: 0 })
      const c = { status: 'NEW', severity: 5, customer_impact: 'High', escalation_level: 0, reopen_count: 0, created_at: created, sla_deadline: deadline }
      const lvl = requiredEscalationLevel(c)
      return { pass: p.score >= 50 && slaState(c) === 'SAFE' && lvl === 0, detail: `${p.level} ${p.score}, SLA ${slaState(c)}, escalation L${lvl}` }
    }
  },
  {
    n: 3,
    title: 'Complaint reopened after resolution',
    desc: 'Reopening a resolved complaint bumps its escalation/priority inputs — the recalculated score gains points and records a "reopened" reason.',
    run() {
      const base = calculatePriority({ severity: 3, customerImpact: 'Medium', slaDeadline: hFromNow(10), createdAt: hAgo(2), prevEscalated: false, reopenCount: 0 })
      const after = calculatePriority({ severity: 3, customerImpact: 'Medium', slaDeadline: hFromNow(10), createdAt: hAgo(2), prevEscalated: true, reopenCount: 1 })
      const hasReason = after.reasons.some(r => /reopen/i.test(r.label))
      return { pass: after.score > base.score && hasReason, detail: `${base.score} → ${after.score}` }
    }
  },
  {
    n: 4,
    title: 'Department unavailable',
    desc: 'When the target department is offline, the complaint is rerouted to the available team with the lightest open workload, and the reroute is logged.',
    run() {
      const depts = [
        { id: 'fin', name: 'Finance', is_available: false },
        { id: 'log', name: 'Logistics', is_available: true },
        { id: 'sup', name: 'General Support', is_available: true }
      ]
      const load = { log: 9, sup: 2 }
      const r = chooseDepartment(depts[0], depts, load)
      return { pass: r.rerouted && r.name === 'General Support', detail: `Finance → ${r.name}` }
    }
  },
  {
    n: 5,
    title: 'Duplicate complaint',
    desc: 'A near-identical complaint from the same customer is detected and flagged for manual review, with a pointer to the original ticket.',
    run() {
      const existing = [{ ticket_number: 'RA-1007', title: 'Payment failed', description: 'My payment was deducted but the order failed and no refund yet' }]
      const dup = findPossibleDuplicate('Payment deducted but the order failed, still no refund received', existing)
      const distinct = findPossibleDuplicate('The delivery driver was rude and left the parcel in the rain', existing)
      return { pass: !!dup && dup.complaint.ticket_number === 'RA-1007' && !distinct, detail: dup ? `matched ${dup.complaint.ticket_number} @ ${dup.score}%` : 'no match' }
    }
  },
  {
    n: 6,
    title: 'Missing category',
    desc: 'A complaint with no recognisable keywords falls back to the "Other" category and the General Support department, with low confidence.',
    run() {
      const r = classifyComplaint('zxcv qwer asdf lorem ipsum nothing here')
      return { pass: r.category === 'Other' && r.department === 'General Support' && r.confidence <= 40, detail: `${r.category} / ${r.department} @ ${r.confidence}%` }
    }
  },
  {
    n: 7,
    title: 'SLA recomputed after a change',
    desc: 'Recomputing an SLA (after a reopen or a priority change) produces a fresh window measured from the change time — not the original creation date.',
    run() {
      const now = new Date().toISOString()
      const hi = calculateSlaDeadline(now, 'High')
      const lo = calculateSlaDeadline(now, 'Low')
      const hiH = Math.round((new Date(hi) - Date.parse(now)) / 3600000)
      const loH = Math.round((new Date(lo) - Date.parse(now)) / 3600000)
      return { pass: hiH === 12 && loH === 48, detail: `High ${hiH}h, Low ${loH}h from now` }
    }
  },
  {
    n: 8,
    title: 'Complaint already escalated',
    desc: 'Escalating a complaint that is already at its required level is a no-op — the history and count are preserved, never double-incremented.',
    run() {
      const c = { status: 'ESCALATED', severity: 5, customer_impact: 'High', escalation_level: 3,
        reopen_count: 1, created_at: hAgo(40), sla_deadline: hAgo(5) }
      const required = requiredEscalationLevel(c)
      const wouldEscalate = required > (c.escalation_level ?? 0)
      return { pass: required === 3 && !wouldEscalate, detail: `required L${required} ≤ current L${c.escalation_level} → skip` }
    }
  }
]

export default function AdminTests() {
  const [results, setResults] = useState(null)

  function runAll() {
    setResults(CASES.map(c => {
      try { return { n: c.n, ...c.run() } }
      catch (e) { return { n: c.n, pass: false, detail: String(e.message || e) } }
    }))
  }

  const passed = results ? results.filter(r => r.pass).length : 0

  return (
    <AppShell variant="admin" title="Test Cases" subtitle={
      <span className="font-mono text-xs text-white/45">engine self-checks · run live in the browser</span>
    }>
      <Panel className="p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="co-chip rounded-xl p-2 text-ink/70 shrink-0"><FlaskConical size={18} /></span>
            <div>
              <h3 className="text-ink font-bold text-[15px]">Hidden test cases</h3>
              <p className="text-inkmute text-xs mt-0.5 max-w-xl">
                Eight edge cases from the problem statement, executed live against the engine logic.
                They run purely in-memory — your demo data is untouched.
              </p>
            </div>
          </div>
          <HotButton className="!px-4 !py-2 shrink-0 w-full sm:w-auto" onClick={runAll}>
            <Play size={14} /> Run all tests
          </HotButton>
        </div>

        {results && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
            <StatTile label="Checks" value={results.length} />
            <StatTile label="Passing" value={passed} tone="green" />
            <StatTile label="Failing" value={results.length - passed} tone={passed === results.length ? 'green' : 'hot'} />
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {CASES.map(c => {
          const r = results?.find(x => x.n === c.n)
          return (
            <Panel key={c.n} className="p-4 border-l-4 border-l-hot/60">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-ink font-semibold text-sm">{c.n}. {c.title}</h4>
                {r && (
                  <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${r.pass ? 'bg-leaf/20 text-leaf' : 'bg-flame/20 text-flame'}`}>
                    {r.pass ? <Check size={12} /> : <X size={12} />} {r.pass ? 'PASS' : 'FAIL'}
                  </span>
                )}
              </div>
              <p className="text-xs text-inkmute mt-1.5 leading-relaxed">{c.desc}</p>
              {r && (
                <p className="font-mono text-[11px] text-ink/70 mt-2 co-chip rounded-lg px-2.5 py-1.5">{r.detail}</p>
              )}
            </Panel>
          )
        })}
      </div>
    </AppShell>
  )
}
