import { useEffect, useState } from 'react'
import { listComplaints } from '../../services/complaintService'
import { slaState } from '../../engines/slaEngine'
import ComplaintTable from '../../components/ComplaintTable'
import { Card } from '../../components/ui'

export default function AgentDashboard() {
  const [complaints, setComplaints] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listComplaints({ role: 'agent' }).then(({ data }) => { setComplaints(data); setLoading(false) })
    const t = setInterval(() => listComplaints({ role: 'agent' }).then(({ data }) => setComplaints(data)), 15000)
    return () => clearInterval(t)
  }, [])

  const filtered = complaints.filter(c => {
    if (filter === 'all') return true
    if (filter === 'approaching') return slaState(c) === 'APPROACHING'
    if (filter === 'breached') return slaState(c) === 'BREACHED'
    if (filter === 'escalated') return c.escalation_level > 0
    return true
  })

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'approaching', label: 'Approaching SLA' },
    { key: 'breached', label: 'Breached' },
    { key: 'escalated', label: 'Escalated' }
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-xl font-bold mb-1">Agent Dashboard</h1>
      <p className="text-muted text-sm mb-6">Sorted by priority — but escalation flags are driven independently by SLA urgency.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`text-xs px-3 py-1.5 rounded-full border ${filter === t.key ? 'bg-accent border-accent text-white' : 'border-line text-muted hover:border-accent'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {loading ? <p className="text-muted text-sm">Loading…</p> : <ComplaintTable complaints={filtered} basePath="/agent" />}
      </Card>
    </div>
  )
}
