const BASE = '/api'

// ---------------------------------------------------------------------------
// Token en memoria — nunca en localStorage/sessionStorage
// ---------------------------------------------------------------------------
let _accessToken: string | null = null
let _currentUser: UserInfo | null = null
let _csrfToken: string | null = null

export function setAccessToken(token: string | null): void {
  _accessToken = token
  _currentUser = token ? decodeToken(token) : null
  if (!token) _csrfToken = null
  // Mantener indicador de sesión activa para que RutaProtegida sepa intentar refresh
  if (token) {
    sessionStorage.setItem('session_active', '1')
  } else {
    sessionStorage.removeItem('session_active')
  }
}

export function getAccessToken(): string | null {
  return _accessToken
}

// csrf_token viene en el body de /auth/login y /auth/refresh (doble-submit
// contra la cookie httpOnly csrf_token). Se reenvía como header en el
// próximo /auth/refresh — protege esa ruta contra CSRF vía cookie auto-enviada.
function _captureCsrfToken(data: unknown): void {
  if (data && typeof data === 'object' && 'csrf_token' in (data as Record<string, unknown>)) {
    const t = (data as Record<string, unknown>).csrf_token
    if (typeof t === 'string') _csrfToken = t
  }
}

export function getCurrentUser(): UserInfo | null {
  return _currentUser
}

// ---------------------------------------------------------------------------
// Eventos globales
// ---------------------------------------------------------------------------

export function emitToast(msg: string, type: 'success' | 'error' | 'warning' = 'success') {
  window.dispatchEvent(new CustomEvent('uca:toast', { detail: { msg, type } }))
}

export function emitHelp() {
  window.dispatchEvent(new CustomEvent('uca:help'))
}

export function emitAvatarUpdated(url: string) {
  window.dispatchEvent(new CustomEvent('uca:avatar', { detail: { url } }))
}

// ---------------------------------------------------------------------------
// CSRF: recuperar el token de la cookie (no-httpOnly) si en memoria no hay
// ---------------------------------------------------------------------------

function _readCsrfFromCookie(): string | null {
  // La cookie "csrf_token" se setea en login/refresh con httponly=False
  return document.cookie.split('; ').find(r => r.startsWith('csrf_token='))?.split('=')[1] ?? null
}

function _getCsrfToken(): string | null {
  return _csrfToken || _readCsrfFromCookie()
}

// ---------------------------------------------------------------------------
// Refresh silencioso
// ---------------------------------------------------------------------------

let _refreshing: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  // Evitar múltiples refreshes paralelos
  if (_refreshing) return _refreshing
  _refreshing = (async () => {
    try {
      const csrf = _getCsrfToken()
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: csrf ? { 'X-CSRF-Token': csrf } : {},
      })
      if (!res.ok) return false
      const data = await res.json()
      setAccessToken(data.access_token)
      _captureCsrfToken(data)
      return true
    } catch {
      return false
    } finally {
      _refreshing = null
    }
  })()
  return _refreshing
}

// ---------------------------------------------------------------------------
// Request core
// ---------------------------------------------------------------------------

async function request<T>(path: string, options?: RequestInit, isRetry = false): Promise<T> {
  const token = getAccessToken()
  const method = options?.method || 'GET'
  const csrf = method !== 'GET' && method !== 'HEAD' ? _getCsrfToken() : null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  }
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',  // necesario para enviar la cookie de refresh
    headers,
  })

  if (res.status === 401 && !isRetry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return request<T>(path, options, true)
    }
    // Refresh falló: limpiar sesión y redirigir a login
    const role = _currentUser?.role
    setAccessToken(null)
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
  const data = await res.json()
  _captureCsrfToken(data)
  return data
}

async function requestBlob(path: string, options?: RequestInit, isRetry = false): Promise<Blob> {
  const token = getAccessToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (res.status === 401 && !isRetry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return requestBlob(path, options, true)
    }
    const role = _currentUser?.role
    setAccessToken(null)
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
  return res.blob()
}

async function requestFormData<T>(path: string, formData: FormData, isRetry = false): Promise<T> {
  const token = getAccessToken()
  const csrf = _getCsrfToken()
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
  }
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  })

  if (res.status === 401 && !isRetry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return requestFormData<T>(path, formData, true)
    }
    const role = _currentUser?.role
    setAccessToken(null)
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
  const data = await res.json()
  _captureCsrfToken(data)
  return data
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
  upload: <T>(path: string, formData: FormData) => requestFormData<T>(path, formData),
  download: (path: string, filename?: string) => requestBlob(path).then(blob => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'download'
    a.click()
    URL.revokeObjectURL(url)
  }),
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// initAuth: intentar refresh silencioso al cargar la app
// Llamar en componentes que necesitan auth antes del primer render.
// ---------------------------------------------------------------------------
export async function initAuth(): Promise<UserInfo | null> {
  if (_accessToken) return _currentUser
  if (!sessionStorage.getItem('session_active')) return null
  const ok = await tryRefresh()
  return ok ? _currentUser : null
}
