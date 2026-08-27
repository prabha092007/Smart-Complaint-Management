/**
 * ComplaintOps UI kit — the warm-dark + rose-panel theme.
 * These primitives are used by the admin and customer areas.
 * (The agent / manager dashboards still use ../ui.jsx.)
 */
import { Link } from 'react-router-dom'

const PANEL_TONE = {
  default: 'co-panel',
  plain: 'co-panel co-panel-plain',
  red: 'co-panel co-panel-red',
  amber: 'co-panel co-panel-amber'
}

export function Panel({ tone = 'default', className = '', children, as: Tag = 'div', ...rest }) {
  return (
    <Tag className={`${PANEL_TONE[tone] || PANEL_TONE.default} rounded-2xl ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

export function SectionTitle({ children, right }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-4">
      <h3 className="text-ink font-semibold text-sm sm:text-[15px]">{children}</h3>
      {right}
    </div>
  )
}

const PILL_TONE = {
  default: 'bg-white/50 text-ink border-white/60',
  hot: 'bg-hot/15 text-flame border-flame/30',
  red: 'bg-flame text-white border-flame',
  amber: 'bg-ember/15 text-ember border-ember/40',
  green: 'bg-leaf/15 text-leaf border-leaf/40',
  ink: 'bg-ink/10 text-ink border-ink/20'
}

export function Pill({ tone = 'default', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${PILL_TONE[tone] || PILL_TONE.default} ${className}`}>
      {children}
    </span>
  )
}

export function HotButton({ children, className = '', as, to, ...props }) {
  const cls = `co-btn inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${className}`
  if (to) return <Link to={to} className={cls} {...props}>{children}</Link>
  return <button className={cls} {...props}>{children}</button>
}

export function GhostButton({ children, className = '', as, to, ...props }) {
  const cls = `inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-ink bg-white/40 border border-white/60 hover:bg-white/60 transition disabled:opacity-50 ${className}`
  if (to) return <Link to={to} className={cls} {...props}>{children}</Link>
  return <button className={cls} {...props}>{children}</button>
}

export function Field({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="text-xs font-medium text-ink/70 mb-1 block">{label}</span>}
      <input
        {...props}
        className={`w-full bg-white/55 border border-white/70 rounded-xl px-3 py-2 text-sm text-ink placeholder:text-inkmute/70 focus:outline-none focus:border-hot focus:bg-white/75 transition ${className}`}
      />
    </label>
  )
}

export function Area({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="text-xs font-medium text-ink/70 mb-1 block">{label}</span>}
      <textarea
        {...props}
        className={`w-full bg-white/55 border border-white/70 rounded-xl px-3 py-2 text-sm text-ink placeholder:text-inkmute/70 focus:outline-none focus:border-hot focus:bg-white/75 transition resize-y min-h-[96px] ${className}`}
      />
    </label>
  )
}

export function Picker({ label, children, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="text-xs font-medium text-ink/70 mb-1 block">{label}</span>}
      <select
        {...props}
        className={`w-full bg-white/55 border border-white/70 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-hot transition ${className}`}
      >
        {children}
      </select>
    </label>
  )
}

export function StatTile({ label, value, sub, icon: Icon, tone = 'ink' }) {
  const valueColor = {
    ink: 'text-ink',
    hot: 'text-flame',
    amber: 'text-ember',
    green: 'text-leaf',
    blue: 'text-[#3f6fd8]'
  }[tone] || 'text-ink'
  return (
    <Panel className="p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2 min-w-0">
      <div className="flex items-start justify-between gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-inkmute leading-tight">{label}</span>
        {Icon && (
          <span className="co-chip rounded-lg p-1.5 text-ink/70 shrink-0">
            <Icon size={14} />
          </span>
        )}
      </div>
      <span className={`text-2xl sm:text-3xl font-bold font-mono leading-none truncate ${valueColor}`}>{value}</span>
      {sub && <span className="text-[11px] text-inkmute truncate">{sub}</span>}
    </Panel>
  )
}

/** Horizontal stacked bar — e.g. SLA health across open complaints. */
export function StackedBar({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-white/40">
        {segments.map((s, i) => (
          s.value > 0 && (
            <div key={i} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
          )
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-ink/80">
        {segments.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            {s.label} <span className="font-mono text-ink">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** Donut chart (hand-rolled SVG, matches the reference "N OPEN" style). Scales to its container. */
export function Donut({ segments, centerValue, centerLabel, maxWidth = 240 }) {
  const VB = 200 // internal coordinate space; SVG scales via viewBox
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const stroke = 24
  const r = (VB - stroke) / 2
  const c = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="relative mx-auto w-full" style={{ maxWidth }}>
      <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-auto block" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={VB / 2} cy={VB / 2} r={r} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c
          const el = (
            <circle
              key={i}
              cx={VB / 2} cy={VB / 2} r={r}
              fill="none" stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-acc}
            />
          )
          acc += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl sm:text-2xl font-bold font-mono text-ink leading-none">{centerValue}</span>
        {centerLabel && <span className="text-[10px] uppercase tracking-wider text-inkmute mt-1">{centerLabel}</span>}
      </div>
    </div>
  )
}

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-[11px] text-ink/80">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: it.color }} />
          {it.label} <span className="font-mono text-ink">{it.value}</span>
        </span>
      ))}
    </div>
  )
}

/** A single department workload row with a progress meter. */
export function WorkloadRow({ label, value, max, meta, offline, warnCount }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-[13px] mb-1">
        <span className="inline-flex items-center gap-2 text-ink font-medium">
          <span className={`w-1.5 h-1.5 rounded-full ${offline ? 'bg-flame' : 'bg-leaf'}`} />
          {label}
          {offline && <Pill tone="red">offline</Pill>}
        </span>
        <span className="text-inkmute font-mono text-[11px] inline-flex items-center gap-2">
          {meta}
          {warnCount > 0 && <span className="text-ember">{warnCount}⚠</span>}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/40 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: offline ? '#e23d63' : 'linear-gradient(90deg,#7db4ff,#3f6fd8)' }} />
      </div>
    </div>
  )
}

export function Switch({ checked, onChange, size = 'md', className = '' }) {
  const track = size === 'lg' ? 'w-14 h-7' : 'w-11 h-6'
  const knob = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
  const shift = checked ? (size === 'lg' ? 'translate-x-[1.75rem]' : 'translate-x-[1.25rem]') : 'translate-x-0'
  return (
    <button
      type="button" role="switch" aria-checked={checked} onClick={onChange}
      className={`${track} shrink-0 rounded-full p-0.5 transition-colors ${checked ? 'bg-hot' : 'bg-ink/20'} ${className}`}
    >
      <span className={`${knob} block rounded-full bg-white shadow transition-transform ${shift}`} />
    </button>
  )
}

export function EmptyNote({ title, subtitle }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {subtitle && <p className="text-xs text-inkmute mt-1">{subtitle}</p>}
    </div>
  )
}

export function Toast({ message, tone = 'default', onClose }) {
  const border = tone === 'error' ? 'border-flame' : tone === 'success' ? 'border-leaf' : 'border-white/60'
  return (
    <div className={`fixed bottom-6 right-6 co-panel rounded-xl px-4 py-3 text-sm text-ink border ${border} z-50 flex items-center gap-3`}>
      {message}
      <button onClick={onClose} className="text-inkmute hover:text-ink">✕</button>
    </div>
  )
}
