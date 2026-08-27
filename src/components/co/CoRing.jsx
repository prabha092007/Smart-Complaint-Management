import { useEffect, useState } from 'react'
import { pctRemaining, slaState } from '../../engines/slaEngine'

const COLORS = { SAFE: '#2fa774', APPROACHING: '#e8803c', BREACHED: '#e23d63', RESOLVED: '#2fa774' }

/** SLA countdown ring tuned for the light rose panels. */
export default function CoRing({ complaint, size = 34 }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const pct = pctRemaining(complaint)
  const state = slaState(complaint)
  const stroke = size > 40 ? 6 : 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(44,26,36,0.14)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={COLORS[state]} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-ink">
        {Math.round(pct)}%
      </div>
    </div>
  )
}

/** The big circular "OVER" / "52m LEFT" badge from the SLA Warnings cards. */
export function SlaStamp({ complaint }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const state = slaState(complaint)
  const ms = new Date(complaint.sla_deadline).getTime() - Date.now()
  const breached = ms <= 0
  const mins = Math.max(0, Math.round(ms / 60000))
  const label = breached
    ? 'OVER'
    : mins >= 60 ? `${Math.round(mins / 60)}h` : `${mins}m`
  const sub = breached ? '' : 'LEFT'
  const color = breached ? '#e23d63' : state === 'APPROACHING' ? '#e8803c' : '#2fa774'

  return (
    <div
      className={`shrink-0 w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center ${breached ? 'animate-ring-glow' : ''}`}
      style={{ borderColor: color, color }}
    >
      <span className="text-[13px] font-bold font-mono leading-none">{label}</span>
      {sub && <span className="text-[8px] font-semibold tracking-wide">{sub}</span>}
    </div>
  )
}
