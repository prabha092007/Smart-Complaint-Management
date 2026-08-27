import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getComplaint, getHistory, getComments, addComment,
  updateStatus, reopenComplaint, checkAndEscalate
} from '../../services/complaintService'
import { slaState, formatRemaining, ESCALATION_LABEL } from '../../engines/slaEngine'
import AppShell from '../../components/co/AppShell'
import { Panel, Pill, HotButton, GhostButton, Area, SectionTitle } from '../../components/co/kit'
import CoRing from '../../components/co/CoRing'
import PriorityPanel from '../../components/co/PriorityPanel'
import { humanStatus } from '../../components/co/ComplaintRows'

const STATUS_OPTIONS = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED']
const SLA_TONE = { SAFE: 'green', APPROACHING: 'amber', BREACHED: 'red', RESOLVED: 'ink' }
const PRIORITY_TONE = { Low: 'ink', Medium: 'amber', High: 'hot', Critical: 'red' }

export default function ComplaintDetail() {
  const { id } = useParams()
  const { user, role } = useAuth()
  const isStaff = role === 'agent' || role === 'manager' || role === 'admin'

  const [complaint, setComplaint] = useState(null)
  const [history, setHistory] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [reopenReason, setReopenReason] = useState('')
  const [showReopen, setShowReopen] = useState(false)

  const load = useCallback(async () => {
    const { data } = await getComplaint(id)
    setComplaint(data)
    setHistory(await getHistory(id))
    setComments(await getComments(id))
    if (data) await checkAndEscalate(data)
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(() => { if (complaint) checkAndEscalate(complaint) }, 15000)
    return () => clearInterval(t)
  }, [complaint])

  const backLink = role === 'customer' ? '/my-complaints' : role === 'admin' ? '/admin/complaints' : `/${role}`
  const c = complaint
  const state = c ? slaState(c) : 'SAFE'

  async function handleStatusChange(status) { await updateStatus(c.id, status); load() }
  async function handleComment() {
    if (!newComment.trim()) return
    await addComment(c.id, user.id, newComment.trim())
    setNewComment(''); load()
  }
  async function handleReopen() {
    await reopenComplaint(c.id, reopenReason)
    setShowReopen(false); setReopenReason(''); load()
  }
  async function handleEscalateNow() { await checkAndEscalate(c); load() }

  const inner = !c ? (
    <p className="text-white/50 text-sm">Loading…</p>
  ) : (
    <>
      <Link to={backLink} className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white mb-4">
        <ArrowLeft size={15} /> Back
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* ---- main column ---- */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <Panel className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs text-inkmute">{c.ticket_number}</p>
                <h2 className="text-ink font-bold text-xl mt-1 break-words">{c.title}</h2>
              </div>
              <CoRing complaint={c} size={52} />
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <Pill tone="ink">{c.categories?.name ?? 'Other'}</Pill>
              <Pill tone="ink">{c.departments?.name ?? 'Unassigned'}</Pill>
              <Pill tone={PRIORITY_TONE[c.priority_level] || 'ink'}>{c.priority_level} · {Number(c.priority_score ?? 0).toFixed(2)}</Pill>
              <Pill tone={SLA_TONE[state]}>{state}</Pill>
              <Pill tone="ink">{humanStatus(c.status)}</Pill>
              {c.reopen_count > 0 && <Pill tone="amber">Reopened ×{c.reopen_count}</Pill>}
              {c.escalation_level > 0 && <Pill tone="red">→ {ESCALATION_LABEL[c.escalation_level]}</Pill>}
            </div>

            <p className="text-sm text-ink/90 mt-4 whitespace-pre-wrap break-words">{c.description}</p>

            {c.proof_urls?.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-inkmute mb-1.5">Proof images</p>
                <div className="flex flex-wrap gap-2">
                  {c.proof_urls.map((url, i) => (
                    <a
                      key={url} href={url} target="_blank" rel="noreferrer"
                      className="block w-20 h-20 rounded-lg overflow-hidden border border-white/60 bg-white/40 hover:ring-2 hover:ring-hot transition"
                    >
                      <img src={url} alt={`Proof ${i + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-inkmute mt-4 border-t border-panelline/60 pt-3">
              <span className="font-semibold text-ink/70">AI:</span>{' '}
              {c.categories?.name ?? 'Other'} · {Math.round(c.ai_confidence ?? 0)}% confidence
              {c.ai_explanation ? ` — ${c.ai_explanation}` : ''}
            </p>
            <p className={`font-mono text-xs mt-2 ${state === 'BREACHED' ? 'text-flame' : state === 'APPROACHING' ? 'text-ember' : 'text-inkmute'}`}>
              SLA: {formatRemaining(c)}
            </p>
          </Panel>

          <div className="grid md:grid-cols-2 gap-4 items-start">
            <Panel className="p-5">
              <SectionTitle>Timeline</SectionTitle>
              <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {history.map(h => (
                  <li key={h.id} className="text-xs flex gap-2.5">
                    <span className="text-inkmute font-mono shrink-0">{new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-ink/85">{describeEvent(h)}</span>
                  </li>
                ))}
                {!history.length && <li className="text-xs text-inkmute">No events yet.</li>}
              </ul>
            </Panel>

            <Panel className="p-5">
              <SectionTitle>Comments</SectionTitle>
              <div className="space-y-3 mb-3 max-h-56 overflow-y-auto pr-1">
                {comments.map(cm => (
                  <div key={cm.id} className="text-sm">
                    <span className="font-semibold text-ink">{cm.profiles?.full_name ?? 'User'}</span>
                    <span className="text-inkmute text-xs ml-2">{cm.profiles?.role}</span>
                    <p className="text-inkmute mt-0.5 break-words">{cm.body}</p>
                  </div>
                ))}
                {!comments.length && <p className="text-inkmute text-xs">No comments yet.</p>}
              </div>
              <Area placeholder="Add a comment…" value={newComment} onChange={e => setNewComment(e.target.value)} rows={2} />
              <HotButton className="mt-2 w-full" onClick={handleComment}>Post comment</HotButton>
            </Panel>
          </div>
        </div>

        {/* ---- side rail ---- */}
        <div className="space-y-4 min-w-0">
          <PriorityPanel
            complaint={c}
            dense
            onEscalate={isStaff ? handleEscalateNow : undefined}
            onResolve={isStaff ? (() => handleStatusChange('RESOLVED')) : undefined}
          />

          <Panel className="p-5">
            <SectionTitle>Lifecycle</SectionTitle>
            {isStaff ? (
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                      c.status === s ? 'bg-hot text-white border-hot' : 'border-ink/20 text-inkmute hover:border-hot'
                    }`}
                  >
                    {humanStatus(s)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-inkmute">
                Current status: <span className="text-ink font-semibold">{humanStatus(c.status)}</span>
              </p>
            )}

            {!isStaff && c.status === 'RESOLVED' && (
              <div className="mt-4">
                {!showReopen ? (
                  <GhostButton className="w-full" onClick={() => setShowReopen(true)}>Not fixed? Reopen</GhostButton>
                ) : (
                  <div className="space-y-2">
                    <Area placeholder="What's still wrong?" value={reopenReason} onChange={e => setReopenReason(e.target.value)} />
                    <div className="flex gap-2">
                      <HotButton onClick={handleReopen}>Confirm reopen</HotButton>
                      <GhostButton onClick={() => setShowReopen(false)}>Cancel</GhostButton>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  )

  const pageTitle = c ? `Complaint ${c.ticket_number}` : 'Complaint detail'
  if (role === 'customer') return <AppShell variant="customer" title={pageTitle} onRefresh={load}>{inner}</AppShell>
  if (role === 'admin') return <AppShell variant="admin" title={pageTitle} onRefresh={load}>{inner}</AppShell>
  return (
    <div className="co-canvas min-h-screen text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">{inner}</div>
    </div>
  )
}

function describeEvent(h) {
  switch (h.event) {
    case 'created': return `Complaint created: "${h.detail?.title ?? ''}"`
    case 'ai_classified': return `AI classified as ${h.detail?.category} (${h.detail?.confidence}% confidence)`
    case 'assigned': return `Assigned to ${h.detail?.department ?? 'a department'}`
    case 'status_changed': return `Status changed to ${h.detail?.status}`
    case 'escalated': return `Escalated to ${ESCALATION_LABEL[h.detail?.level] ?? 'next level'}`
    case 'reopened': return `Reopened by customer${h.detail?.reason ? `: "${h.detail.reason}"` : ''}`
    case 'comment_added': return 'New comment added'
    case 'reassigned': return h.detail?.to
      ? `Rerouted ${h.detail.from ? `from ${h.detail.from} ` : ''}to ${h.detail.to}${h.detail.reason ? ` (${h.detail.reason})` : ''}`
      : 'Reassigned to a different agent'
    case 'duplicate_flagged': return `Flagged as a possible duplicate of ${h.detail?.original ?? 'another ticket'} (${h.detail?.score ?? '?'}% match)`
    case 'proof_attached': return `${h.detail?.count ?? 1} proof image${h.detail?.count === 1 ? '' : 's'} attached`
    default: return h.event
  }
}
