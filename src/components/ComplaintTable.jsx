import { Link } from 'react-router-dom'
import { Badge, EmptyState } from './ui'
import SLARing from './SLARing'
import { slaState, formatRemaining } from '../engines/slaEngine'

const SLA_TONE = { SAFE: 'safe', APPROACHING: 'warn', BREACHED: 'breach', RESOLVED: 'default' }
const PRIORITY_TONE = { Low: 'safe', Medium: 'warn', High: 'crit', Critical: 'breach' }

export default function ComplaintTable({ complaints, basePath }) {
  if (!complaints.length) {
    return <EmptyState title="No complaints here" subtitle="Nothing matches the current filters." />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-line">
            <th className="py-3 pr-4">Ticket</th>
            <th className="py-3 pr-4">Title</th>
            <th className="py-3 pr-4">Category</th>
            <th className="py-3 pr-4">Priority</th>
            <th className="py-3 pr-4">Department</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">SLA</th>
            <th className="py-3 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {complaints.map(c => {
            const state = slaState(c)
            return (
              <tr key={c.id} className="border-b border-line/60 hover:bg-panel2/50">
                <td className="py-3 pr-4 font-mono text-xs text-muted">{c.ticket_number}</td>
                <td className="py-3 pr-4 max-w-[220px] truncate">{c.title}</td>
                <td className="py-3 pr-4"><Badge tone="accent">{c.categories?.name ?? 'Other'}</Badge></td>
                <td className="py-3 pr-4">
                  <Badge tone={PRIORITY_TONE[c.priority_level] || 'default'}>{c.priority_level} · {c.priority_score}</Badge>
                </td>
                <td className="py-3 pr-4 text-muted">{c.departments?.name ?? '—'}</td>
                <td className="py-3 pr-4"><Badge>{c.status}</Badge></td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <SLARing complaint={c} size={30} />
                    <span className={`font-mono text-xs ${state === 'BREACHED' ? 'text-breach' : state === 'APPROACHING' ? 'text-warn' : 'text-muted'}`}>
                      {formatRemaining(c)}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <Link to={`${basePath}/${c.id}`} className="text-accent text-xs font-semibold hover:underline">View →</Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
