import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { listComplaints, updateStatus, checkAndEscalate } from '../../services/complaintService'
import { useEscalation } from '../../context/EscalationContext'
import AppShell from '../../components/co/AppShell'
import { Panel } from '../../components/co/kit'
import ComplaintRows from '../../components/co/ComplaintRows'
import PriorityPanel from '../../components/co/PriorityPanel'

const STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'REOPENED', 'ESCALATED', 'CLOSED']
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="appearance-none bg-white/55 border border-white/70 rounded-full pl-3 pr-7 py-1.5 text-xs text-ink focus:outline-none focus:border-hot cursor-pointer"
      >
        <option value="all">{label}: all</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-inkmute text-[9px]">▼</span>
    </div>
  )
}

export default function AdminComplaints() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState([])
  const [selected, setSelected] = useState(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [dept, setDept] = useState('all')
  const [sort, setSort] = useState('priority')

  const { tick } = useEscalation()
  const refresh = useCallback(() => {
    listComplaints({ role: 'admin' }).then(({ data }) => setComplaints(data))
  }, [])
  useEffect(() => { refresh() }, [refresh, tick])
  useEffect(() => {
    const t = setInterval(refresh, 12000)
    return () => clearInterval(t)
  }, [refresh])

  // keep the selected panel fresh
  useEffect(() => {
    if (selected) {
      const updated = complaints.find(c => c.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [complaints]) // eslint-disable-line

  const departments = useMemo(
    () => [...new Set(complaints.map(c => c.departments?.name).filter(Boolean))].sort(),
    [complaints]
  )

  const filtered = useMemo(() => {
    let rows = complaints.filter(c => {
      if (status !== 'all' && c.status !== status) return false
      if (priority !== 'all' && c.priority_level !== priority) return false
      if (dept !== 'all' && c.departments?.name !== dept) return false
      if (q.trim()) {
        const hay = `${c.ticket_number} ${c.title} ${c.customer_id}`.toLowerCase()
        if (!hay.includes(q.trim().toLowerCase())) return false
      }
      return true
    })
    rows = [...rows].sort((a, b) => {
      if (sort === 'priority') return (b.priority_score ?? 0) - (a.priority_score ?? 0)
      if (sort === 'sla') return new Date(a.sla_deadline) - new Date(b.sla_deadline)
      if (sort === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      return 0
    })
    return rows
  }, [complaints, status, priority, dept, q, sort])

  async function handleEscalate(c) { await checkAndEscalate(c); refresh() }
  async function handleResolve(c) { await updateStatus(c.id, 'RESOLVED'); refresh() }

  return (
    <AppShell variant="admin" title="Complaints" onRefresh={refresh}>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <Panel className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-inkmute pointer-events-none" />
              <input
                placeholder="Search complaints…"
                value={q}
                onChange={e => setQ(e.target.value)}
                className="w-full bg-white/55 border border-white/70 rounded-xl pl-9 pr-3 py-2 text-sm text-ink placeholder:text-inkmute/70 focus:outline-none focus:border-hot"
              />
            </div>
            <span className="text-xs text-inkmute font-mono shrink-0">{filtered.length} / {complaints.length}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <FilterSelect label="status" value={status} onChange={e => setStatus(e.target.value)} options={STATUSES} />
            <FilterSelect label="priority" value={priority} onChange={e => setPriority(e.target.value)} options={PRIORITIES} />
            <FilterSelect label="department" value={dept} onChange={e => setDept(e.target.value)} options={departments} />
            <div className="relative ml-auto">
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="appearance-none bg-white/55 border border-white/70 rounded-full pl-3 pr-7 py-1.5 text-xs text-ink focus:outline-none focus:border-hot cursor-pointer"
              >
                <option value="priority">sort: priority</option>
                <option value="sla">sort: SLA deadline</option>
                <option value="newest">sort: newest</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-inkmute text-[9px]">▼</span>
            </div>
          </div>

          <ComplaintRows
            complaints={filtered}
            selectedId={selected?.id}
            onRowClick={setSelected}
          />
        </Panel>

        <div className="xl:sticky xl:top-4">
          <PriorityPanel
            complaint={selected}
            onEscalate={handleEscalate}
            onResolve={handleResolve}
            detailLink={selected ? `/admin/${selected.id}` : null}
          />
        </div>
      </div>
    </AppShell>
  )
}
