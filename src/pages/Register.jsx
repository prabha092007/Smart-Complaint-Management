import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Panel, Field, HotButton } from '../components/co/kit'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  return (
    <div className="co-canvas min-h-screen flex items-center justify-center px-4 sm:px-6 py-10 sm:py-12 text-white">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2.5 mb-6 justify-center">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#ff4d87,#7db4ff)' }}>
            <Zap size={18} className="text-white" />
          </span>
          <span className="font-bold text-[15px]">ComplaintOps</span>
        </Link>

        <Panel className="p-5 sm:p-7">
          {done ? (
            <>
              <h1 className="text-ink font-bold text-lg mb-2">Check your email</h1>
              <p className="text-sm text-inkmute mb-4">
                Confirm your account, then log in. New accounts start as <strong className="text-ink">customer</strong> —
                an admin can promote staff accounts from Supabase.
              </p>
              <Link to="/login" className="text-flame text-sm font-semibold">Go to login →</Link>
            </>
          ) : (
            <>
              <h1 className="text-ink font-bold text-xl mb-1">Create your account</h1>
              <p className="text-inkmute text-sm mb-5">Track your complaints and their SLA status.</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <Field label="Full name" value={fullName} onChange={e => setFullName(e.target.value)} required />
                <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                <Field label="Password" type="password" placeholder="min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                {error && <p className="text-flame text-xs">{error}</p>}
                <HotButton type="submit" disabled={loading} className="w-full">
                  {loading ? 'Creating…' : 'Sign up'}
                </HotButton>
              </form>
              <p className="text-xs text-inkmute mt-4">
                Already have an account? <Link to="/login" className="text-flame font-semibold">Log in</Link>
              </p>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
