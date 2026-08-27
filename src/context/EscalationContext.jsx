import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { listComplaints, checkAndEscalate } from '../services/complaintService'

const Ctx = createContext(null)
const KEY = 'co.autoEscalation'

/**
 * Shared auto-escalation engine. When enabled (admin only) it sweeps every
 * open complaint every 12s and escalates any whose SLA state now demands it.
 * The topbar pill and the Escalations page both read this.
 */
export function EscalationProvider({ children }) {
  const { role } = useAuth()
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(KEY) === '1' } catch { return false }
  })
  const [runs, setRuns] = useState(0)
  const [totalEscalated, setTotalEscalated] = useState(0)
  const [lastRun, setLastRun] = useState(null)
  const [tick, setTick] = useState(0)
  const busy = useRef(false)

  const sweep = useCallback(async () => {
    if (busy.current) return { escalated: 0 }
    busy.current = true
    try {
      const { data } = await listComplaints({ role: 'admin' })
      let escalated = 0
      for (const c of data) {
        const res = await checkAndEscalate(c)
        if (res.escalated) escalated++
      }
      setRuns(r => r + 1)
      setTotalEscalated(t => t + escalated)
      setLastRun(new Date())
      setTick(x => x + 1)
      return { escalated }
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(KEY, enabled ? '1' : '0') } catch { /* ignore */ }
  }, [enabled])

  useEffect(() => {
    if (!enabled || role !== 'admin') return
    sweep()
    const id = setInterval(sweep, 12000)
    return () => clearInterval(id)
  }, [enabled, role, sweep])

  const value = {
    enabled,
    toggle: () => setEnabled(e => !e),
    setEnabled,
    runs,
    totalEscalated,
    lastRun,
    tick,
    sweep
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useEscalation() {
  return useContext(Ctx) ?? {
    enabled: false, toggle: () => {}, setEnabled: () => {},
    runs: 0, totalEscalated: 0, lastRun: null, tick: 0, sweep: async () => ({ escalated: 0 })
  }
}
