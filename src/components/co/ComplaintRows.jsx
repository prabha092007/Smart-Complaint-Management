import { ArrowUpCircle } from 'lucide-react'
import { Pill, EmptyNote } from './kit'
import { slaState, formatRemaining } from '../../engines/slaEngine'

const PRIORITY_TONE = { Low: 'ink', Medium: 'amber', High: 'hot', Critical: 'red' }
const SLA_TONE = { SAFE: 'green', APPROACHING: 'amber', BREACHED: 'red', RESOLVED: 'ink' }

export function humanStatus(s) {
  return ({
    NEW: 'New', ASSIGNED: 'Assigned', IN_PROGRESS: 'In progress',
    WAITING_FOR_CUSTOMER: 'Waiting', RESOLVED: 'Resolved', REOPENED: 'Reopened',
    ESCALATED: 'Escalated', CLOSED: 'Closed'
  })[s] || s
}

export function countdownText(c) {
  const state = slaState(c)
  const cls = state === 'BREACHED' ? 'text-flame' : state === 'APPROACHING' ? 'text-ember' : 'text-inkmute'
  return <span className={`font-mono text-xs ${cls}`}>{formatRemaining(c)}</span>
}

export default function ComplaintRows({ complaints, onRowClick, selectedId, flaggedIds = [] }) {
  if (!complaints.length) {
    return <EmptyNote title="No complaints here" subtitle="Nothing matches the current filters." />
  }
  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="w-full text-sm border-collapse min-w-[280px] md:min-w-[440px] lg:min-w-[600px]">
        <thead>
          <tr className="text-left text-inkmute text-[10px] font-semibold uppercase tracking-wider border-b border-panelline/70">
            <th className="py-2.5 px-2 sm:pr-3">ID</th>
            <th className="py-2.5 pr-3 hidden xl:table-cell">Customer</th>
            <th className="py-2.5 pr-3 hidden sm:table-cell">Category</th>
            <th className="py-2.5 pr-3 hidden xl:table-cell">Sev</th>
            <th className="py-2.5 pr-3">Priority</th>
            <th className="py-2.5 pr-3 hidden md:table-cell">Status</th>
            <th className="py-2.5 pr-3">SLA</th>
            <th className="py-2.5 pr-3 hidden lg:table-cell">Countdown</th>
            <th className="py-2.5 pr-3 hidden lg:table-cell">Dept</th>
            <th className="py-2.5 pr-1 hidden md:table-cell"></th>
          </tr>
        </thead>
        <tbody>
          {complaints.map(c => {
            const state = slaState(c)
            const selected = selectedId === c.id
            return (
              <tr
                key={c.id}
                onClick={() => onRowClick?.(c)}
                className={`border-b border-panelline/50 transition ${onRowClick ? 'cursor-pointer' : ''} ${
                  selected ? 'bg-white/45' : 'hover:bg-white/25'
                }`}
              >
                <td className="py-2.5 px-2 sm:pr-3 font-mono text-xs text-ink font-semibold whitespace-nowrap">
                  {c.ticket_number}
                  {flaggedIds.includes(c.id) && <span className="ml-1 text-ember">⚑</span>}
                  {c.proof_urls?.length > 0 && <span className="ml-1 text-inkmute" title="proof attached">📎</span>}
                </td>
                <td className="py-2.5 pr-3 text-inkmute whitespace-nowrap hidden xl:table-cell">{c.customer_ref || shortId(c.customer_id)}</td>
                <td className="py-2.5 pr-3 text-ink hidden sm:table-cell">{c.categories?.name ?? 'Other'}</td>
                <td className="py-2.5 pr-3 font-mono text-ink hidden xl:table-cell">{c.severity ?? '—'}</td>
                <td className="py-2.5 pr-3">
                  <Pill tone={PRIORITY_TONE[c.priority_level] || 'ink'}>
                    <span className="hidden sm:inline">{c.priority_level} </span>
                    <span className="font-mono">{Number(c.priority_score ?? 0).toFixed(2)}</span>
                  </Pill>
                </td>
                <td className="py-2.5 pr-3 text-ink whitespace-nowrap hidden md:table-cell">{humanStatus(c.status)}</td>
                <td className="py-2.5 pr-3">
                  <Pill tone={SLA_TONE[state]}>{state === 'BREACHED' ? 'Breached' : state === 'APPROACHING' ? 'Critical' : state === 'RESOLVED' ? 'Done' : 'Safe'}</Pill>
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap hidden lg:table-cell">{countdownText(c)}</td>
                <td className="py-2.5 pr-3 text-inkmute whitespace-nowrap hidden lg:table-cell">{c.departments?.name ?? '—'}</td>
                <td className="py-2.5 pr-1 text-inkmute hidden md:table-cell">
                  {(c.escalation_level ?? 0) > 0
                    ? <ArrowUpCircle size={15} className="text-flame" />
                    : <ArrowUpCircle size={15} className="opacity-30" />}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function shortId(id) {
  if (!id) return '—'
  return 'CUST-' + String(id).replace(/-/g, '').slice(0, 4).toUpperCase()
}
