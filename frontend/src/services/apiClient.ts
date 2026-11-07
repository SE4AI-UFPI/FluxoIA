import { tokenStorage } from '@/services/authService'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const access = tokenStorage.getAccess()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (access) {
    headers.Authorization = `Bearer ${access}`
  }

  const response = await fetch(path, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail =
      data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string'
        ? data.detail
        : `Erro HTTP ${response.status}`
    throw new Error(detail)
  }

  return data as T
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: (path: string, body?: unknown) =>
    request<void>(path, {
      method: 'DELETE',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
}
