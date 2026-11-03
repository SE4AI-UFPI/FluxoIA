import type { AuthTokensResponse, LoginPayload, Usuario } from '@/types/auth'

const ACCESS_TOKEN_KEY = 'fluxoia_access_token'
const REFRESH_TOKEN_KEY = 'fluxoia_refresh_token'
const USER_STORAGE_KEY = 'fluxoia_user'

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  getStoredUser: (): Usuario | null => {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as Usuario
    } catch {
      return null
    }
  },
  saveSession: ({ access, refresh, user }: AuthTokensResponse) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  },
  updateStoredUser: (user: Usuario) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)
  },
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const obj = data as Record<string, unknown>
  if (typeof obj.detail === 'string') {
    if (obj.detail.toLowerCase().includes('no active account')) {
      return 'E-mail ou senha inválidos.'
    }
    return obj.detail
  }
  const firstKey = Object.keys(obj)[0]
  if (firstKey) {
    const val = obj[firstKey]
    if (Array.isArray(val) && typeof val[0] === 'string') return val[0]
    if (typeof val === 'string') return val
  }
  return fallback
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthTokensResponse> {
    const res = await fetch('/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(extractErrorMessage(data, 'Não foi possível entrar. Verifique suas credenciais.'))
    }

    const session = data as AuthTokensResponse
    tokenStorage.saveSession(session)
    return session
  },

  async fetchMe(): Promise<Usuario> {
    const access = tokenStorage.getAccess()
    if (!access) {
      throw new Error('Sessão não autenticada.')
    }

    const res = await fetch('/api/auth/me/', {
      headers: {
        Authorization: `Bearer ${access}`,
      },
    })

    if (!res.ok) {
      tokenStorage.clear()
      throw new Error('Sessão expirada.')
    }

    const user = (await res.json()) as Usuario
    tokenStorage.updateStoredUser(user)
    return user
  },

  logout() {
    tokenStorage.clear()
  },
}
