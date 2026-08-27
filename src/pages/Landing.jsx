import { Link, Navigate } from 'react-router-dom'
import { Zap, Clock, TrendingUp, ArrowUpCircle, BarChart3 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Panel } from '../components/co/kit'

const FEATURES = [
  { icon: Zap, title: 'AI Classification', body: 'Every complaint is auto-categorized and scored for severity and customer impact — instantly, with no external API to fail mid-demo.' },
  { icon: TrendingUp, title: 'Transparent Priority', body: 'A 0–100 score from severity, impact, SLA urgency, age and history — every point explained, never a black box.' },
  { icon: Clock, title: 'Live SLA Monitoring', body: 'Real countdown timers computed from the actual deadline. Safe, critical, or breached — always current.' },
  { icon: ArrowUpCircle, title: 'Independent Escalation', body: 'A low-priority ticket 15 minutes from breach escalates ahead of a fresh high-priority one hours out.' },
  { icon: BarChart3, title: 'Real Analytics', body: 'Resolution rate, SLA compliance, escalation rate, department load — all computed live, never hard-coded.' }
]

const HOME = { customer: '/my-complaints', agent: '/agent', manager: '/manager', admin: '/admin' }

export default function Landing() {
  const { user, role } = useAuth()
  if (user && role && HOME[role]) return <Navigate to={HOME[role]} replace />

  return (
    <div className="co-canvas min-h-screen text-white">
      <header className="max-w-5xl mx-auto px-5 sm:px-6 py-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#ff4d87,#7db4ff)' }}>
            <Zap size={18} className="text-white" />
          </span>
          <span className="font-bold text-[15px]">ComplaintOps</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/login" className="text-white/60 hover:text-white">Login</Link>
          <Link to="/register" className="co-btn px-4 py-2 rounded-xl font-semibold">Sign up</Link>
        </nav>
      </header>

      <section className="px-5 sm:px-6 py-14 sm:py-20 max-w-3xl mx-auto text-center">
        <span className="font-mono text-xs uppercase tracking-widest text-hot2">Complaint Management &amp; SLA Escalation</span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-4 leading-tight">
          Resolve Every Complaint<br />Before It Becomes a Crisis.
        </h1>
        <p className="text-white/55 mt-5 max-w-xl mx-auto">
          AI-powered complaint management with intelligent prioritization, real-time SLA
          monitoring, and automatic escalation.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Link to="/register" className="co-btn px-6 py-3 rounded-xl font-semibold text-sm">Get Started</Link>
          <Link to="/login" className="px-6 py-3 rounded-xl font-semibold text-sm text-white/70 border border-white/15 hover:bg-white/5">Login</Link>
        </div>
      </section>

      <section className="px-5 sm:px-6 pb-20 sm:pb-24 max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <Panel key={title} className="p-5 sm:p-6">
            <Icon size={20} className="text-flame mb-3" />
            <h3 className="font-semibold text-ink mb-1">{title}</h3>
            <p className="text-sm text-inkmute leading-relaxed">{body}</p>
          </Panel>
        ))}
      </section>
    </div>
  )
}
