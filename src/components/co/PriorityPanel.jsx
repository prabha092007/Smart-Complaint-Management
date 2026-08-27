import { ArrowUpCircle, Check } from 'lucide-react'
import { Panel, Pill, HotButton, GhostButton } from './kit'
import { slaState, formatRemaining, ESCALATION_LABEL } from '../../engines/slaEngine'
import { humanStatus } from './ComplaintRows'

const PRIORITY_TONE = { Low: 'ink', Medium: 'amber', High: 'hot', Critical: 'red' }
const REASON_COLORS = ['#e23d63', '#e8803c', '#3f6fd8', '#a259c4', '#3fa774', '#d59a2e']

function ScoreDonut({ score }) {
  const VB = 140, stroke = 18
  const r = (VB - stroke) / 2
  const c = 2 * Math.PI * r
  const filled = (Math.min(100, score) / 100) * c
  return (
    <div className="relative shrink-0 w-28 sm:w-32">
      <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-auto block" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={VB / 2} cy={VB / 2} r={r} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={stroke} />
        <circle
          cx={VB / 2} cy={VB / 2} r={r} fill="none"
          stroke="url(#coScore)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
        />
        <defs>
          <linearGradient id="coScore" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff4d87" />
            <stop offset="100%" stopColor="#e8803c" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl sm:text-2xl font-bold font-mono text-ink leading-none">{Number(score ?? 0).toFixed(2)}</span>
        <span className="text-[10px] text-inkmute">/100</span>
      </div>
    </div>
  )
}

export default function PriorityPanel({ complaint, onEscalate, onResolve, detailLink, dense = false }) {
  if (!complaint) {
    return (
      <Panel tone="plain" className="p-8 text-center text-inkmute text-sm">
        Select a complaint to see its priority score breakdown
      </Panel>
    )
  }
  const c = complaint
  const state = slaState(c)
  const reasons = c.priority_reasons || []
  const showActions = onEscalate || (onResolve && c.status !== 'RESOLVED' && c.status !== 'CLOSED') || detailLink

  return (
    <Panel className="p-5 space-y-4">
      {dense ? (
        <h3 className="text-ink font-semibold text-[15px]">Priority breakdown</h3>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-ink font-bold text-lg leading-tight truncate">Complaint {c.ticket_number}</h3>
              <p className="text-[11px] text-inkmute mt-0.5 truncate">
                {c.categories?.name ?? 'Other'} · {new Date(c.created_at).toLocaleDateString([], { day: '2-digit', month: 'short' })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Pill tone="ink">{humanStatus(c.status)}</Pill>
              {state === 'BREACHED' && <Pill tone="red">Breached</Pill>}
            </div>
          </div>
          <p className="text-sm text-ink/90">{c.title}</p>
        </>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <ScoreDonut score={c.priority_score} />
        <ul className="flex-1 space-y-1.5 min-w-[140px]">
          {reasons.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="inline-flex items-center gap-1.5 text-inkmute truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: REASON_COLORS[i % REASON_COLORS.length] }} />
                {r.label}
              </span>
              <span className="font-mono text-ink font-semibold shrink-0">+{r.points}</span>
            </li>
          ))}
          {!reasons.length && <li className="text-xs text-inkmute">No score breakdown recorded.</li>}
        </ul>
      </div>

      <div className="flex items-center justify-between border-t border-panelline/60 pt-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-inkmute">Priority</span>
        <Pill tone={PRIORITY_TONE[c.priority_level] || 'ink'}>
          {c.priority_level} <span className="font-mono">{Number(c.priority_score ?? 0).toFixed(2)}</span>
        </Pill>
      </div>

      <div className="co-chip rounded-xl px-3 py-2 text-[11px] font-mono text-ink/80">
        SLA {formatRemaining(c)} · {SLA_HOURS_LABEL(c)}
      </div>

      {(c.escalation_level ?? 0) > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-inkmute mb-1">Escalation</p>
          <Pill tone="red">→ {ESCALATION_LABEL[c.escalation_level]}</Pill>
        </div>
      )}

      {showActions && (
        <div className="space-y-2 pt-1">
          {onEscalate && (
            <HotButton className="w-full" onClick={() => onEscalate(c)}>
              <ArrowUpCircle size={15} /> Escalate now
            </HotButton>
          )}
          {onResolve && c.status !== 'RESOLVED' && c.status !== 'CLOSED' && (
            <GhostButton className="w-full" onClick={() => onResolve(c)}>
              <Check size={15} /> Mark resolved
            </GhostButton>
          )}
          {detailLink && (
            <GhostButton className="w-full" to={detailLink}>Open full detail →</GhostButton>
          )}
        </div>
      )}
    </Panel>
  )
}

function SLA_HOURS_LABEL(c) {
  if (!c.sla_hours) return '—'
  return `${Math.round(c.sla_hours)}h window`
}
