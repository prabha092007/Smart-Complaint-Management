import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpCircle, Flag } from 'lucide-react'
import { listComplaints, checkAndEscalate } from '../../services/complaintService'
import { slaState, formatRemaining } from '../../engines/slaEngine'
import { useEscalation } from '../../context/EscalationContext'
import AppShell from '../../components/co/AppShell'
import { Panel, Pill, HotButton } from '../../components/co/kit'
import { SlaStamp } from '../../components/co/CoRing'

const PRIORITY_TONE = { Low: 'ink', Medium: 'amber', High: 'hot', Critical: 'red' }
const ACTIVE = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'REOPENED', 'ESCALATED']

export default function AdminWarnings() {
  const { tick } = useEscalation()
  const [complaints, setComplaints] = useState([])

  const refresh = useCallback(() => {
    listComplaints({ role: 'admin' }).then(({ data }) => setComplaints(data))
  }, [])
  useEffect(() => { refresh() }, [refresh, tick])
  useEffect(() => {
    const t = setInterval(refresh, 12000)
    return () => clearInterval(t)
  }, [refresh])

  const atRisk = complaints
    .filter(c => ACTIVE.includes(c.status) && ['APPROACHING', 'BREACHED'].includes(slaState(c)))
    .sort((a, b) => new Date(a.sla_deadline) - new Date(b.sla_deadline))

  const breachedCount = atRisk.filter(c => slaState(c) === 'BREACHED').length

  async function escalate(c) {
    await checkAndEscalate(c)
    refresh()
  }

  return (
    <AppShell variant="admin" title="SLA Warnings" onRefresh={refresh}>
      <Panel tone="red" className="p-5 mb-4">
        <p className="text-flame font-bold text-lg">🚨 {breachedCount} complaint(s) have BREACHED SLA</p>
        <p className="text-ink/70 text-sm mt-0.5">
          {atRisk.length} complaint(s) at risk (critical or worse) — regardless of priority
        </p>
      </Panel>

      {!atRisk.length ? (
        <Panel tone="plain" className="p-10 text-center text-inkmute text-sm">
          Nothing at risk right now. Every open complaint has healthy SLA headroom.
        </Panel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
          {atRisk.map(c => {
            const state = slaState(c)
            const ratio = c.sla_hours
              ? (new Date(c.sla_deadline).getTime() - Date.now()) / 3600000 / c.sla_hours
              : 0
            const lowButUrgent = ['Low', 'Medium'].includes(c.priority_level)
            return (
              <Panel key={c.id} tone={state === 'BREACHED' ? 'red' : 'amber'} className="p-4 flex flex-col gap-3">
                <div className="flex gap-3">
                  <SlaStamp complaint={c} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link to={`/admin/${c.id}`} className="font-mono text-xs font-bold text-ink">{c.ticket_number}</Link>
                      <Pill tone={PRIORITY_TONE[c.priority_level] || 'ink'}>
                        {c.priority_level} <span className="font-mono">{Number(c.priority_score ?? 0).toFixed(2)}</span>
                      </Pill>
                    </div>
                    <p className="text-[10px] uppercase tracking-wide text-inkmute mt-1">
                      {c.categories?.name ?? 'Other'} · {c.departments?.name ?? 'Unassigned'}
                    </p>
                    <p className="text-sm text-ink/90 mt-1 line-clamp-2">{c.title}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-2 mt-auto">
                  <div>
                    <p className={`font-mono text-xs ${state === 'BREACHED' ? 'text-flame' : 'text-ember'}`}>
                      {formatRemaining(c)}
                    </p>
                    <p className="font-mono text-[10px] text-inkmute">
                      SLA {c.sla_hours ? `${Math.round(c.sla_hours)}h` : '—'} · ratio {ratio.toFixed(4)}
                    </p>
                  </div>
                  <HotButton className="!px-3 !py-1.5 !text-xs" onClick={() => escalate(c)}>
                    <ArrowUpCircle size={13} /> Escalate
                  </HotButton>
                </div>

                {lowButUrgent && (
                  <div className="co-chip rounded-lg px-2.5 py-1.5 text-[11px] text-flame flex items-start gap-1.5">
                    <Flag size={12} className="mt-0.5 shrink-0" />
                    {c.priority_level} priority but SLA-critical — escalate ahead of newer high-priority tickets
                  </div>
                )}
              </Panel>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
