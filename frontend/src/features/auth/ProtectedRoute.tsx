import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, type AuthUser } from './AuthProvider'

export function LoadingScreen() {
  return <div className="auth-loading"><div className="loading-mark">H</div><span>Carregando seu espaço...</span></div>
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function RoleRoute({ roles }: { roles: AuthUser['role'][] }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!roles.includes(user.role)) return <Navigate to="/orders" replace />
  return <Outlet />
}
