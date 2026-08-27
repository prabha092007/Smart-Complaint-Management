import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, Clock, ArrowUpCircle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Panel, Field, HotButton } from '../components/co/kit'

const POINTS = [
  { icon: Clock, text: 'Live SLA countdowns computed from the real deadline' },
  { icon: ArrowUpCircle, text: 'Escalation driven by urgency, independent of priority' },
  { icon: ShieldCheck, text: 'Transparent 0–100 priority score, every point explained' }
]

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div className="co-canvas min-h-screen flex items-center justify-center px-4 sm:px-6 py-10 sm:py-12 text-white">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Brand side */}
        <div className="hidden md:block px-4">
          <Link to="/" className="flex items-center gap-2.5 mb-8">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#ff4d87,#7db4ff)' }}>
              <Zap size={20} className="text-white" />
            </span>
            <span className="leading-tight">
              <span className="block font-bold text-lg">ComplaintOps</span>
              <span className="block text-xs text-white/45">SLA Escalation System</span>
            </span>
          </Link>
          <h2 className="text-3xl font-bold leading-tight">
            Resolve every complaint<br />before it breaches.
          </h2>
          <ul className="mt-7 space-y-3">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-white/60">
                <Icon size={16} className="text-hot2 mt-0.5 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Form side */}
        <Panel className="p-5 sm:p-7">
          <h1 className="text-ink font-bold text-xl mb-1">Log in</h1>
          <p className="text-inkmute text-sm mb-5">Welcome back — pick up where the queue left off.</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
            <Field label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <p className="text-flame text-xs">{error}</p>}
            <HotButton type="submit" disabled={loading} className="w-full">
              {loading ? 'Logging in…' : 'Log in'}
            </HotButton>
          </form>
          <p className="text-xs text-inkmute mt-4">
            No account? <Link to="/register" className="text-flame font-semibold">Sign up</Link>
          </p>
        </Panel>
      </div>
    </div>
  )
}
