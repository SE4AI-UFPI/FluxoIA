import * as React from 'react'
import { authService, tokenStorage } from '@/services/authService'
import type { LoginPayload, Usuario } from '@/types/auth'

interface AuthContextValue {
  user: Usuario | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<Usuario | null>(() => tokenStorage.getStoredUser())
  const [isLoading, setIsLoading] = React.useState<boolean>(() => Boolean(tokenStorage.getAccess()))

  React.useEffect(() => {
    const token = tokenStorage.getAccess()
    if (!token) {
      setIsLoading(false)
      return
    }

    authService
      .fetchMe()
      .then((freshUser) => setUser(freshUser))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = React.useCallback(async (payload: LoginPayload) => {
    const session = await authService.login(payload)
    setUser(session.user)
  }, [])

  const logout = React.useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.')
  }
  return ctx
}
