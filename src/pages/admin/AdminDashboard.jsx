import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { List, Clock, CheckCircle2, AlertTriangle, Flame, ArrowUpCircle } from 'lucide-react'
import { listComplaints, listEscalations } from '../../services/complaintService'
import { getAnalytics, getDepartmentWorkload } from '../../services/analyticsService'
import { slaState, requiredEscalationLevel } from '../../engines/slaEngine'
import { useEscalation } from '../../context/EscalationContext'
import AppShell from '../../components/co/AppShell'
import {
  Panel, StatTile, SectionTitle, StackedBar, Donut, Legend, WorkloadRow, GhostButton
} from '../../components/co/kit'
import { countdownText } from '../../components/co/ComplaintRows'

const OPEN = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'REOPENED', 'ESCALATED']

export default function AdminDashboard() {
  const { tick } = useEscalation()
  const [complaints, setComplaints] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [workload, setWorkload] = useState([])
  const [escalations, setEscalations] = useState([])

  const refresh = useCallback(() => {
    listComplaints({ role: 'admin' }).then(({ data }) => setComplaints(data))
    getAnalytics().then(setAnalytics)
    getDepartmentWorkload().then(setWorkload)
    listEscalations().then(setEscalations)
  }, [])

  useEffect(() => { refresh() }, [refresh, tick])
  useEffect(() => {
    const t = setInterval(refresh, 12000)
    return () => clearInterval(t)
  }, [refresh])

  const open = complaints.filter(c => OPEN.includes(c.status))
  const breached = open.filter(c => slaState(c) === 'BREACHED')
  const critical = open.filter(c => slaState(c) === 'APPROACHING')
  const warning = open.filter(c => {
    const ms = new Date(c.sla_deadline).getTime() - Date.now()
    return ms > 0 && ms <= 4 * 3600000 && slaState(c) !== 'APPROACHING'
  })
  const safe = open.filter(c => !breached.includes(c) && !critical.includes(c) && !warning.includes(c))
  const needEscalation = open.filter(c => requiredEscalationLevel(c) > (c.escalation_level ?? 0))
  const soon = open.filter(c => {
    const ms = new Date(c.sla_deadline).getTime() - Date.now()
    return ms > 0 && ms <= 2 * 3600000
  })

  const bucket = lvl => open.filter(c => (
    lvl === 'High' ? ['High', 'Critical'].includes(c.priority_level) : c.priority_level === lvl
  )).length
  const mix = [
    { label: 'HIGH', value: bucket('High'), color: '#e23d63' },
    { label: 'MEDIUM', value: bucket('Medium'), color: '#e8803c' },
    { label: 'LOW', value: bucket('Low'), color: '#6b5566' }
  ]

  const atRisk = [...breached, ...critical]
    .sort((a, b) => new Date(a.sla_deadline) - new Date(b.sla_deadline))
    .slice(0, 6)

  const maxLoad = Math.max(1, ...workload.map(w => w.open))

  return (
    <AppShell variant="admin" title="Dashboard" onRefresh={refresh}>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <StatTile label="Total" value={analytics?.total ?? complaints.length} icon={List} />
        <StatTile label="Open" value={open.length} icon={Clock} tone="blue" />
        <StatTile label="Resolved" value={analytics?.resolvedCount ?? 0} icon={CheckCircle2} tone="green"
          sub={analytics?.resolvedCount ? `${analytics.resolutionRate}% resolution` : 'no data yet'} />
        <StatTile label="SLA Breached" value={breached.length} icon={AlertTriangle} tone="hot" />
        <StatTile label="SLA Critical" value={critical.length} icon={Flame} tone="amber" />
        <StatTile label="Need Escalation" value={needEscalation.length} icon={ArrowUpCircle} tone="hot"
          sub={`${escalations.length} escalations logged`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* left column */}
        <div className="lg:col-span-2 space-y-4">
          <Panel className="p-5">
            <SectionTitle right={<GhostButton to="/admin/warnings" className="!px-3 !py-1 !text-xs">view warnings →</GhostButton>}>
              SLA health · open complaints
            </SectionTitle>
            <StackedBar segments={[
              { label: 'Breached', value: breached.length, color: '#e23d63' },
              { label: 'Critical', value: critical.length, color: '#e8803c' },
              { label: 'Warning', value: warning.length, color: '#e8b03c' },
              { label: 'Safe', value: safe.length, color: '#2fa774' }
            ]} />

            {soon.length > 0 && (
              <div className="mt-4 co-panel-red rounded-xl px-3 py-2 text-xs text-flame font-medium border border-flame/20">
                ⚠ {soon.length} complaint(s) breaching within 2 hours
              </div>
            )}

            <ul className="mt-4 divide-y divide-panelline/50">
              {atRisk.map(c => (
                <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${slaState(c) === 'BREACHED' ? 'bg-flame' : 'bg-ember'}`} />
                  <Link to={`/admin/${c.id}`} className="font-mono text-xs text-ink font-semibold shrink-0 w-16">{c.ticket_number}</Link>
                  <span className="text-ink/85 truncate flex-1">{c.title}</span>
                  <span className="shrink-0">{countdownText(c)}</span>
                </li>
              ))}
              {!atRisk.length && <li className="py-3 text-xs text-inkmute">No open complaints at risk.</li>}
            </ul>
          </Panel>

          <Panel className="p-5">
            <SectionTitle>Department workload</SectionTitle>
            <div className="space-y-3.5">
              {workload.map(w => (
                <WorkloadRow
                  key={w.id}
                  label={w.name}
                  value={w.open}
                  max={maxLoad}
                  offline={!w.isAvailable}
                  warnCount={w.atRisk}
                  meta={`${w.open} open`}
                />
              ))}
              {!workload.length && <p className="text-xs text-inkmute">No departments configured.</p>}
            </div>
          </Panel>
        </div>

        {/* right column */}
        <div className="space-y-4">
          <Panel className="p-5">
            <SectionTitle>Priority mix</SectionTitle>
            <Donut segments={mix} centerValue={open.length} centerLabel="open" />
            <Legend items={mix} />
          </Panel>

          <Panel className="p-5">
            <SectionTitle>Recent escalations</SectionTitle>
            <ul className="divide-y divide-panelline/50">
              {escalations.slice(0, 7).map(e => (
                <li key={e.id} className="py-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <Link to={`/admin/${e.complaint_id}`} className="font-mono text-ink font-semibold">{e.complaints?.ticket_number ?? '—'}</Link>
                    <span className="text-inkmute">{timeAgo(e.created_at)}</span>
                  </div>
                  <p className="text-inkmute mt-0.5">
                    {e.complaints?.departments?.name ?? 'Unassigned'} · level {e.level}
                  </p>
                </li>
              ))}
              {!escalations.length && <li className="py-3 text-xs text-inkmute">No escalations logged yet.</li>}
            </ul>
          </Panel>
        </div>
      </div>
    </AppShell>
  )
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
