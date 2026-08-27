import { useEffect, useState } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Zap, LayoutGrid, AlertTriangle, ListChecks, ArrowUpCircle,
  FlaskConical, LogOut, RefreshCw, Plus, Menu, X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useEscalation } from '../../context/EscalationContext'
import { getDepartmentWorkload } from '../../services/analyticsService'

const NAV = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutGrid, end: true },
    { to: '/admin/warnings', label: 'SLA Warnings', icon: AlertTriangle },
    { to: '/admin/complaints', label: 'Complaints', icon: ListChecks },
    { to: '/admin/escalations', label: 'Escalations', icon: ArrowUpCircle },
    { to: '/admin/tests', label: 'Test Cases', icon: FlaskConical }
  ],
  customer: [
    { to: '/my-complaints', label: 'My Complaints', icon: ListChecks, end: true },
    { to: '/submit', label: 'New Complaint', icon: Plus }
  ]
}

const CHIP_COLORS = ['#3fa774', '#e23d63', '#e8803c', '#3f6fd8', '#a259c4', '#d59a2e']

function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="font-mono text-xs text-white/45">
      {now.toLocaleTimeString('en-GB')} <span className="text-white/30 hidden sm:inline">· auto-refresh 12s</span>
    </span>
  )
}

function DepartmentChips() {
  const [depts, setDepts] = useState([])
  useEffect(() => { getDepartmentWorkload().then(setDepts).catch(() => {}) }, [])
  if (!depts.length) return null
  return (
    <div className="px-4 pb-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">Departments</p>
      <div className="flex flex-wrap gap-1.5">
        {depts.map((d, i) => (
          <span
            key={d.id}
            className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5"
            style={{ color: d.isAvailable ? CHIP_COLORS[i % CHIP_COLORS.length] : '#e23d63' }}
          >
            {d.name}
            <span className="font-mono text-white/40">{d.open}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function RefreshButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 shrink-0 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/70 transition"
      title="Refresh"
    >
      <RefreshCw size={15} />
    </button>
  )
}

function AutoEscalationPill() {
  const { enabled, toggle } = useEscalation()
  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 h-9 px-2.5 sm:px-3 shrink-0 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-xs font-medium text-white/80 transition"
      title="Toggle the auto-escalation engine"
    >
      <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-leaf' : 'bg-white/35'}`} />
      <span className="hidden sm:inline">Auto-escalation </span>
      <span className="sm:hidden">Auto </span>
      {enabled ? 'ON' : 'OFF'}
    </button>
  )
}

export default function AppShell({ variant = 'admin', title, subtitle, onRefresh, actions, children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const nav = NAV[variant] || NAV.admin
  const doRefresh = onRefresh || (() => window.location.reload())
  const [navOpen, setNavOpen] = useState(false)

  // close the mobile drawer whenever the route changes
  useEffect(() => { setNavOpen(false) }, [location.pathname])

  const standardActions = (variant === 'admin' || variant === 'customer') && (
    <>
      {variant === 'admin' && <AutoEscalationPill />}
      <RefreshButton onClick={doRefresh} />
      {variant === 'customer' && (
        <Link to="/submit" className="co-btn inline-flex items-center gap-1.5 h-9 px-3 sm:px-4 rounded-xl text-sm font-semibold shrink-0">
          <Plus size={15} /> <span className="hidden sm:inline">New complaint</span><span className="sm:hidden">New</span>
        </Link>
      )}
    </>
  )

  return (
    <div className="co-canvas min-h-screen lg:flex text-white">
      {navOpen && (
        <div className="fixed inset-0 bg-black/55 z-40 lg:hidden" onClick={() => setNavOpen(false)} />
      )}

      <aside
        className={`co-rail w-60 shrink-0 flex flex-col border-r border-railline/60 z-50 overflow-y-auto
          fixed inset-y-0 left-0 transition-transform duration-200 lg:static lg:translate-x-0
          ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#ff4d87,#7db4ff)' }}>
              <Zap size={18} className="text-white" />
            </span>
            <span className="leading-tight">
              <span className="block font-bold text-[15px]">ComplaintOps</span>
              <span className="block text-[10px] text-white/40">SLA Escalation System</span>
            </span>
          </Link>
          <button className="lg:hidden text-white/50 hover:text-white p-1" onClick={() => setNavOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="px-3 space-y-1 mt-2">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  isActive ? 'bg-white/12 text-white' : 'text-white/55 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />
        {variant === 'admin' && <DepartmentChips />}

        <div className="px-3 pb-4 border-t border-railline/60 pt-3">
          <button
            onClick={async () => { await signOut(); navigate('/') }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/55 hover:text-flame w-full transition"
          >
            <LogOut size={15} />
            <span className="truncate">{profile?.full_name ?? 'Sign out'}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-3 px-4 sm:px-6 lg:px-8 py-4">
          <button
            className="lg:hidden w-9 h-9 shrink-0 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/70"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight truncate">{title}</h1>
            <div className="mt-0.5">{subtitle || <Clock />}</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
            {actions}
            {standardActions}
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-12 overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
