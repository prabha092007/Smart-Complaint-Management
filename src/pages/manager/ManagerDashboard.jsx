import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { listComplaints } from '../../services/complaintService'
import { getAnalytics } from '../../services/analyticsService'
import { slaState } from '../../engines/slaEngine'
import ComplaintTable from '../../components/ComplaintTable'
import { Card } from '../../components/ui'

const COLORS = ['#5B8CFF', '#33C17F', '#F5A623', '#FF5D3B', '#FF2E4D', '#8B93A1']

export default function ManagerDashboard() {
  const [complaints, setComplaints] = useState([])
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    listComplaints({ role: 'manager' }).then(({ data }) => setComplaints(data))
    getAnalytics().then(setAnalytics)
  }, [])

  const urgent = complaints
    .filter(c => ['APPROACHING', 'BREACHED'].includes(slaState(c)))
    .sort((a, b) => {
      // Sort purely by SLA risk first (breached before approaching), THEN severity/impact —
      // deliberately not by priority_score, to keep escalation independent of priority.
      const rank = s => (s === 'BREACHED' ? 0 : 1)
      const diff = rank(slaState(a)) - rank(slaState(b))
      if (diff !== 0) return diff
      return b.severity - a.severity
    })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-1">Manager Dashboard</h1>
        <p className="text-muted text-sm">Department performance and SLA-risk triage.</p>
      </div>

      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total" value={analytics.total} />
          <Stat label="SLA Compliance" value={`${analytics.slaComplianceRate}%`} />
          <Stat label="Escalation Rate" value={`${analytics.escalationRate}%`} />
          <Stat label="Reopen Rate" value={`${analytics.reopenRate}%`} />
        </div>
      )}

      <Card>
        <h3 className="text-xs uppercase tracking-wide text-breach mb-3">Urgent Action Required</h3>
        <ComplaintTable complaints={urgent} basePath="/manager" />
      </Card>

      {analytics && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-xs uppercase tracking-wide text-muted mb-3">By Department</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.byDepartment}>
                <XAxis dataKey="name" stroke="#8B93A1" fontSize={10} />
                <YAxis stroke="#8B93A1" fontSize={10} />
                <Tooltip contentStyle={{ background: '#171D26', border: '1px solid #2A3240' }} />
                <Bar dataKey="value" fill="#5B8CFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h3 className="text-xs uppercase tracking-wide text-muted mb-3">By Priority</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={analytics.byPriority} dataKey="value" nameKey="name" outerRadius={80}>
                  {analytics.byPriority.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#171D26', border: '1px solid #2A3240' }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <Card className="text-center">
      <p className="text-2xl font-mono font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted mt-1">{label}</p>
    </Card>
  )
}
