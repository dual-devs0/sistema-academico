const BASE = '/api'

// Evento global para mostrar toasts desde cualquier lugar
export function emitToast(msg: string, type: 'success'|'error'|'warning' = 'success') {
  window.dispatchEvent(new CustomEvent('uca:toast', { detail: { msg, type } }))
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem('token')
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  // Interceptor de sesión expirada
  if (res.status === 401) {
    const decoded = token ? (() => {
      try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
    })() : null
    const role = decoded?.role
    sessionStorage.removeItem('token')
    emitToast('Tu sesión ha expirado. Iniciá sesión nuevamente.', 'warning')
    setTimeout(() => {
      window.location.href = role === 'admin' ? '/admin' : '/login'
    }, 1500)
    throw new Error('Sesión expirada')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Error de conexión')
  }
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface UserInfo {
  username: string
  role: string
  user_id?: number
}

export function decodeToken(token: string): UserInfo | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return { username: payload.sub, role: payload.role, user_id: payload.user_id }
  } catch {
    return null
  }
}
