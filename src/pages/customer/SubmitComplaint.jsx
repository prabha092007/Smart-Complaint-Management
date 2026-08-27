import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ImagePlus, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { submitComplaint, checkDuplicate } from '../../services/complaintService'
import { classifyComplaint } from '../../lib/classifier'
import { validateProofFiles, MAX_PROOF_FILES } from '../../lib/proof'
import AppShell from '../../components/co/AppShell'
import { Panel, Field, Area, HotButton, Pill } from '../../components/co/kit'

export default function SubmitComplaint() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [proofFiles, setProofFiles] = useState([])
  const [proofError, setProofError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [dup, setDup] = useState(null)

  const preview = useMemo(() => (description.trim() ? classifyComplaint(description) : null), [description])

  const previews = useMemo(
    () => proofFiles.map(f => ({ name: f.name, url: URL.createObjectURL(f) })),
    [proofFiles]
  )
  useEffect(() => () => previews.forEach(p => URL.revokeObjectURL(p.url)), [previews])

  // debounced duplicate lookup
  useEffect(() => {
    if (description.trim().length < 15) { setDup(null); return }
    const id = setTimeout(() => { checkDuplicate(user.id, description).then(setDup).catch(() => {}) }, 500)
    return () => clearTimeout(id)
  }, [description, user.id])

  function addFiles(e) {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    if (!picked.length) return
    const combined = [...proofFiles, ...picked]
    const err = validateProofFiles(combined)
    if (err) { setProofError(err); return }
    setProofError('')
    setProofFiles(combined)
  }

  function removeFile(idx) {
    setProofError('')
    setProofFiles(proofFiles.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const { data, error } = await submitComplaint({ customerId: user.id, title, description, proofFiles })
    setSubmitting(false)
    if (error) setError(error.message)
    else navigate(`/my-complaints/${data.id}`)
  }

  return (
    <AppShell variant="customer" title="Submit a complaint">
      <div className="max-w-2xl">
        <Panel className="p-5">
          <p className="text-inkmute text-sm mb-5">
            Describe what happened — the system classifies, prioritizes, and routes it automatically.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Title" placeholder="Short summary, e.g. Payment deducted but order failed" value={title} onChange={e => setTitle(e.target.value)} required />
            <Area
              label="Description"
              placeholder="e.g. My ₹5,000 payment was deducted but the transaction failed and I haven't received my refund."
              value={description} onChange={e => setDescription(e.target.value)} required rows={5}
            />

            {/* Proof images */}
            <div>
              <span className="text-xs font-medium text-ink/70 mb-1 block">
                Proof images <span className="text-inkmute">(optional)</span>
              </span>
              <div className="flex flex-wrap gap-3">
                {previews.map((p, i) => (
                  <div key={p.url} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/60 bg-white/40">
                    <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-ink/70 text-white flex items-center justify-center hover:bg-flame"
                      aria-label={`Remove ${p.name}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {proofFiles.length < MAX_PROOF_FILES && (
                  <label className="w-24 h-24 rounded-xl border border-dashed border-ink/30 bg-white/30 flex flex-col items-center justify-center gap-1 text-inkmute cursor-pointer hover:border-hot hover:text-hot transition">
                    <ImagePlus size={18} />
                    <span className="text-[10px] font-medium">Add image</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      multiple
                      className="hidden"
                      onChange={addFiles}
                    />
                  </label>
                )}
              </div>
              <p className="text-[11px] text-inkmute mt-1.5">JPEG or PNG · up to {MAX_PROOF_FILES} images · 5&nbsp;MB each</p>
              {proofError && <p className="text-flame text-xs mt-1">{proofError}</p>}
            </div>

            {dup && (
              <div className="co-panel-red rounded-xl p-3 text-xs text-flame flex items-start gap-2 border border-flame/20">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  Looks similar to your complaint <strong>{dup.complaint.ticket_number}</strong> ({dup.score}% match).
                  You can still submit — it will be flagged for manual review.
                </span>
              </div>
            )}

            {preview && (
              <div className="co-chip rounded-xl p-4">
                <p className="text-[10px] text-inkmute uppercase tracking-wide mb-2">AI analysis (live preview)</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Pill tone="hot">{preview.category}</Pill>
                  <Pill tone="ink">{preview.department}</Pill>
                  <Pill tone={preview.severity >= 4 ? 'red' : preview.severity === 3 ? 'amber' : 'green'}>Severity {preview.severity}/5</Pill>
                  <Pill tone={preview.customerImpact === 'High' ? 'red' : preview.customerImpact === 'Medium' ? 'amber' : 'green'}>{preview.customerImpact} impact</Pill>
                  <Pill tone="ink">{preview.confidence}% confidence</Pill>
                </div>
                <p className="text-xs text-inkmute">{preview.explanation}</p>
              </div>
            )}

            {error && <p className="text-flame text-xs">{error}</p>}
            <HotButton type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Submitting…' : 'Submit complaint'}
            </HotButton>
          </form>
        </Panel>
      </div>
    </AppShell>
  )
}
