import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import type { AuthUser } from './AuthProvider'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="auth-loading"><div className="loading-mark">H</div><span>Carregando seu espaço...</span></div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function RoleRoute({ roles }: { roles: AuthUser['role'][] }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <div className="auth-loading"><div className="loading-mark">H</div><span>Carregando seu espaço...</span></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!roles.includes(user.role)) return <Navigate to="/orders" replace />
  return <Outlet />
}
