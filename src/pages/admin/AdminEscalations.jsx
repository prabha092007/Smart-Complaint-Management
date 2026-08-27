import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { listComplaints, listEscalations } from '../../services/complaintService'
import { slaState, requiredEscalationLevel, ESCALATION_LABEL } from '../../engines/slaEngine'
import { useEscalation } from '../../context/EscalationContext'
import AppShell from '../../components/co/AppShell'
import { Panel, Pill, Switch, GhostButton, SectionTitle, EmptyNote } from '../../components/co/kit'

const ACTIVE = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'REOPENED', 'ESCALATED']
const TIER = { 1: 'agent', 2: 'manager', 3: 'top tier' }

export default function AdminEscalations() {
  const { enabled, toggle, runs, totalEscalated, lastRun, tick, sweep } = useEscalation()
  const [complaints, setComplaints] = useState([])
  const [history, setHistory] = useState([])
  const [running, setRunning] = useState(false)

  const refresh = useCallback(() => {
    listComplaints({ role: 'admin' }).then(({ data }) => setComplaints(data))
    listEscalations().then(setHistory)
  }, [])
  useEffect(() => { refresh() }, [refresh, tick])
  useEffect(() => {
    const t = setInterval(refresh, 12000)
    return () => clearInterval(t)
  }, [refresh])

  const queue = complaints
    .filter(c => ACTIVE.includes(c.status) && ['APPROACHING', 'BREACHED'].includes(slaState(c)))
    .map(c => ({ c, required: requiredEscalationLevel(c), state: slaState(c) }))
    .sort((a, b) => new Date(a.c.sla_deadline) - new Date(b.c.sla_deadline))
  const ready = queue.filter(q => q.required > (q.c.escalation_level ?? 0))

  const groups = groupHistory(history)

  async function runOnce() {
    setRunning(true)
    await sweep()
    await refresh()
    setRunning(false)
  }

  return (
    <AppShell variant="admin" title="Escalations" onRefresh={refresh}>
      {/* engine panel */}
      <Panel className="p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="co-chip rounded-xl p-2 text-ink/70 shrink-0"><Zap size={18} /></span>
            <div>
              <h3 className="text-ink font-bold text-[15px]">Auto-escalation engine</h3>
              <p className="text-inkmute text-xs mt-0.5">
                {enabled ? 'Running — sweeping every open complaint every 12s' : 'Paused — escalate manually or turn on'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            <GhostButton className="!px-3 !py-1.5 !text-xs" onClick={runOnce} disabled={running}>
              {running ? 'Running…' : 'Run once'}
            </GhostButton>
            <Switch checked={enabled} onChange={toggle} size="lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <EngineStat label="Runs" value={runs} />
          <EngineStat label="Total escalated" value={totalEscalated} />
          <EngineStat label="Last run" value={lastRun ? lastRun.toLocaleTimeString('en-GB') : 'never'} small />
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* pending queue */}
        <Panel className="p-5">
          <SectionTitle right={
            <span className="text-[11px] font-mono text-inkmute">{ready.length} ready · {queue.length} total</span>
          }>Pending queue</SectionTitle>

          {!queue.length ? (
            <EmptyNote title="Queue is clear" subtitle="No open complaint is currently critical or breached." />
          ) : (
            <ul className="space-y-2.5">
              {queue.map(({ c, required, state }) => (
                <li key={c.id} className="co-chip rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/${c.id}`} className="font-mono text-xs font-bold text-ink">{c.ticket_number}</Link>
                      <span className="text-inkmute text-[11px]">{shortCust(c.customer_id)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <Pill tone={state === 'BREACHED' ? 'red' : 'amber'}>
                        {state === 'BREACHED' ? 'SLA breached' : 'SLA critical'}
                      </Pill>
                      {(c.severity >= 4 || c.customer_impact === 'High') && <Pill tone="hot">High severity</Pill>}
                      {(c.escalation_level ?? 0) > 0 && <Pill tone="ink">already L{c.escalation_level}</Pill>}
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <p className="text-[11px] text-ink">
                      {c.departments?.name ?? 'Unassigned'} <span className="text-inkmute">→</span>{' '}
                      <span className="text-flame font-medium">{ESCALATION_LABEL[required]}</span>
                    </p>
                    <span className="text-[10px] uppercase tracking-wide text-inkmute">{TIER[required] || '—'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* history */}
        <Panel className="p-5">
          <SectionTitle>Escalation history</SectionTitle>
          {!groups.length ? (
            <EmptyNote title="Nothing escalated yet" subtitle="Escalations show here as SLA thresholds are crossed." />
          ) : (
            <div className="space-y-5 max-h-[62vh] overflow-y-auto pr-1">
              {groups.map(g => (
                <div key={g.complaintId}>
                  <div className="flex items-center gap-2 mb-2">
                    <Link to={`/admin/${g.complaintId}`} className="font-semibold text-ink text-sm">
                      Complaint {g.ticket}
                    </Link>
                    <Pill tone="hot">{g.rows.length}× escalated</Pill>
                  </div>
                  <ul className="space-y-2 border-l border-panelline/70 pl-3">
                    {g.rows.map(r => (
                      <li key={r.id} className="relative text-xs">
                        <span className="absolute -left-[1.35rem] top-1 w-2 h-2 rounded-full bg-flame" />
                        <p className="font-mono text-ink">
                          L{r.level} <span className="text-inkmute">→</span> {ESCALATION_LABEL[r.level]}
                        </p>
                        <p className="text-inkmute mt-0.5">{fmtDate(r.created_at)} · {reasonLabel(r.reason)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  )
}

function EngineStat({ label, value, small }) {
  return (
    <div className="co-chip rounded-xl px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-inkmute">{label}</p>
      <p className={`font-mono font-bold text-ink mt-1 ${small ? 'text-lg' : 'text-2xl'}`}>{value}</p>
    </div>
  )
}

function groupHistory(history) {
  const map = new Map()
  for (const h of history) {
    if (!map.has(h.complaint_id)) {
      map.set(h.complaint_id, { complaintId: h.complaint_id, ticket: h.complaints?.ticket_number ?? '—', rows: [] })
    }
    map.get(h.complaint_id).rows.push(h)
  }
  const groups = [...map.values()]
  groups.forEach(g => g.rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
  groups.sort((a, b) => {
    const la = a.rows[a.rows.length - 1].created_at
    const lb = b.rows[b.rows.length - 1].created_at
    return new Date(lb) - new Date(la)
  })
  return groups
}

function reasonLabel(reason = '') {
  if (/BREACH/i.test(reason)) return 'SLA breached'
  if (/APPROACH/i.test(reason)) return 'SLA critical'
  return reason || 'escalated'
}

function fmtDate(ts) {
  return new Date(ts).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function shortCust(id) {
  if (!id) return 'CUST-—'
  return 'CUST-' + String(id).replace(/-/g, '').slice(0, 4).toUpperCase()
}
