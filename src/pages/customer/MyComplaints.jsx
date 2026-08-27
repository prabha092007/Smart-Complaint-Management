import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListChecks, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { listComplaints } from '../../services/complaintService'
import { slaState } from '../../engines/slaEngine'
import AppShell from '../../components/co/AppShell'
import { Panel, StatTile, SectionTitle } from '../../components/co/kit'
import ComplaintRows from '../../components/co/ComplaintRows'

const OPEN = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'REOPENED', 'ESCALATED']

export default function MyComplaints() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  function refresh() {
    listComplaints({ role: 'customer', userId: user.id }).then(({ data }) => {
      setComplaints(data); setLoading(false)
    })
  }
  useEffect(() => { refresh() }, [user.id])

  const open = complaints.filter(c => OPEN.includes(c.status))
  const resolved = complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED')
  const breached = complaints.filter(c => slaState(c) === 'BREACHED')

  return (
    <AppShell variant="customer" title="My Complaints" onRefresh={refresh}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatTile label="Total" value={complaints.length} icon={ListChecks} />
        <StatTile label="Open" value={open.length} icon={Clock} tone="blue" />
        <StatTile label="Resolved" value={resolved.length} icon={CheckCircle2} tone="green" />
        <StatTile label="SLA Breached" value={breached.length} icon={AlertTriangle} tone="hot" />
      </div>

      <Panel className="p-5">
        <SectionTitle>All my complaints</SectionTitle>
        {loading
          ? <p className="text-inkmute text-sm">Loading…</p>
          : <ComplaintRows complaints={complaints} onRowClick={c => navigate(`/my-complaints/${c.id}`)} />}
      </Panel>
    </AppShell>
  )
}
