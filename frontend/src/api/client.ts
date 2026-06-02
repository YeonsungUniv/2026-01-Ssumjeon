import { useAuthStore } from '@/store/authStore'

const BASE_URL = '/api'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: Method
  body?: unknown
  params?: Record<string, string | number | undefined>
  withCredentials?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, withCredentials = false } = options

  // 쿼리스트링 조립
  let url = BASE_URL + path
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    if (qs) url += '?' + qs
  }

  const token = useAuthStore.getState().accessToken
  const isFormData = body instanceof FormData
  const headers: Record<string, string> = {}
  if (!isFormData) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
    credentials: withCredentials ? 'include' : 'same-origin',
  })

  // 401 → 토큰 갱신 후 1회 재시도
  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${useAuthStore.getState().accessToken}` }
      const retry = await fetch(url, {
        method,
        headers: retryHeaders,
        body: body !== undefined ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined,
        credentials: withCredentials ? 'include' : 'same-origin',
      })
      if (!retry.ok) throw await toError(retry)
      return retry.json() as Promise<T>
    }
    useAuthStore.getState().logout()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) throw await toError(res)
  // 204 No Content
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    if (!res.ok) return false
    const data = await res.json()
    useAuthStore.getState().setAccessToken(data.data.accessToken)
    return true
  } catch {
    return false
  }
}

async function toError(res: Response): Promise<Error> {
  try {
    const data = await res.json()
    return new Error(data?.message ?? `HTTP ${res.status}`)
  } catch {
    return new Error(`HTTP ${res.status}`)
  }
}

// ── 공개 API ────────────────────────────────────────────────────────
const client = {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) =>
    request<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown, opts?: { withCredentials?: boolean }) =>
    request<T>(path, { method: 'POST', body, ...opts }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body }),

  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body }),
}

export default client
