import { useEffect, useState } from 'react'
import { pctRemaining, slaState } from '../engines/slaEngine'

const COLORS = { SAFE: '#33C17F', APPROACHING: '#F5A623', BREACHED: '#FF2E4D', RESOLVED: '#33C17F' }

export default function SLARing({ complaint, size = 52 }) {
  const [, forceTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceTick(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const pct = pctRemaining(complaint)
  const state = slaState(complaint)
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2A3240" strokeWidth="5" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={COLORS[state]} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-semibold">
        {Math.round(pct)}%
      </div>
    </div>
  )
}
