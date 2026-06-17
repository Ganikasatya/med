import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

/**
 * Route guard. Waits for the initial /auth/me rehydrate, then:
 *  - no user        -> redirect to `loginPath`
 *  - role mismatch  -> redirect to that user's own console
 */
export default function RequireAuth({ roles, loginPath = '/clinic-login', children }) {
  const { user, loading, homeFor } = useAuth()
  if (loading) {
    return <div className="grid h-screen place-items-center text-sm text-slate-400">Loading…</div>
  }
  if (!user) return <Navigate to={loginPath} replace />
  if (roles && !roles.includes(user.role_name)) return <Navigate to={homeFor(user.role_name)} replace />
  return children
}
