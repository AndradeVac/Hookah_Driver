import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { api } from '../../services/api'
import { login as loginRequest, logout as clearSession, type LoginPayload } from '../../services/auth'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'OPERATOR'
  active: boolean
}

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('hookah-driver-token')
    if (!token) {
      setIsLoading(false)
      return
    }

    api.get<AuthUser>('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => clearSession())
      .finally(() => setIsLoading(false))
  }, [])

  async function login(payload: LoginPayload) {
    await loginRequest(payload)
    const { data } = await api.get<AuthUser>('/auth/me')
    setUser(data)
  }

  function logout() {
    clearSession()
    setUser(null)
  }

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    logout,
  }), [user, isLoading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}
