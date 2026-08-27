import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from './context/AuthContext'

// Public entry points load eagerly; everything behind auth is code-split.
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'

const SubmitComplaint = lazy(() => import('./pages/customer/SubmitComplaint'))
const MyComplaints = lazy(() => import('./pages/customer/MyComplaints'))
const ComplaintDetail = lazy(() => import('./pages/customer/ComplaintDetail'))
const AgentDashboard = lazy(() => import('./pages/agent/AgentDashboard'))
const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminWarnings = lazy(() => import('./pages/admin/AdminWarnings'))
const AdminComplaints = lazy(() => import('./pages/admin/AdminComplaints'))
const AdminEscalations = lazy(() => import('./pages/admin/AdminEscalations'))
const AdminTests = lazy(() => import('./pages/admin/AdminTests'))

function ProtectedRoute({ children, roles }) {
  const { user, role, loading } = useAuth()
  if (loading) return <CenteredLoader />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />
  return <Suspense fallback={<CenteredLoader />}>{children}</Suspense>
}

function CenteredLoader() {
  return <div className="min-h-screen flex items-center justify-center text-white/50 text-sm co-canvas">Loading…</div>
}

/* Legacy top-nav chrome — still used by the agent + manager dashboards. */
function LegacyChrome({ children }) {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-bg text-white">
      <header className="border-b border-line px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link to="/" className="flex items-center gap-2 font-bold text-sm">
          <ShieldCheck size={18} className="text-accent" />
          ResolveAI
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {(role === 'agent' || role === 'manager' || role === 'admin') &&
            <Link to="/agent" className="text-muted hover:text-white">Agent</Link>}
          {(role === 'manager' || role === 'admin') &&
            <Link to="/manager" className="text-muted hover:text-white">Manager</Link>}
          {role === 'admin' &&
            <Link to="/admin" className="text-muted hover:text-white">Admin</Link>}
          <button
            onClick={async () => { await signOut(); navigate('/') }}
            className="flex items-center gap-1 text-muted hover:text-breach"
          >
            <LogOut size={14} /> {profile?.full_name ?? 'Sign out'}
          </button>
        </nav>
      </header>
      {children}
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Customer — ComplaintOps shell */}
      <Route path="/submit" element={<ProtectedRoute roles={['customer']}><SubmitComplaint /></ProtectedRoute>} />
      <Route path="/my-complaints" element={<ProtectedRoute roles={['customer']}><MyComplaints /></ProtectedRoute>} />
      <Route path="/my-complaints/:id" element={<ProtectedRoute roles={['customer']}><ComplaintDetail /></ProtectedRoute>} />

      {/* Agent / Manager — legacy chrome */}
      <Route path="/agent" element={<ProtectedRoute roles={['agent', 'manager', 'admin']}><LegacyChrome><AgentDashboard /></LegacyChrome></ProtectedRoute>} />
      <Route path="/agent/:id" element={<ProtectedRoute roles={['agent', 'manager', 'admin']}><LegacyChrome><ComplaintDetail /></LegacyChrome></ProtectedRoute>} />
      <Route path="/manager" element={<ProtectedRoute roles={['manager', 'admin']}><LegacyChrome><ManagerDashboard /></LegacyChrome></ProtectedRoute>} />
      <Route path="/manager/:id" element={<ProtectedRoute roles={['manager', 'admin']}><LegacyChrome><ComplaintDetail /></LegacyChrome></ProtectedRoute>} />

      {/* Admin — ComplaintOps shell */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/warnings" element={<ProtectedRoute roles={['admin']}><AdminWarnings /></ProtectedRoute>} />
      <Route path="/admin/complaints" element={<ProtectedRoute roles={['admin']}><AdminComplaints /></ProtectedRoute>} />
      <Route path="/admin/escalations" element={<ProtectedRoute roles={['admin']}><AdminEscalations /></ProtectedRoute>} />
      <Route path="/admin/tests" element={<ProtectedRoute roles={['admin']}><AdminTests /></ProtectedRoute>} />
      <Route path="/admin/:id" element={<ProtectedRoute roles={['admin']}><ComplaintDetail /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
