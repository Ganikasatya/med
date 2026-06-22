/**
 * Tiny fetch wrapper for the backend API.
 *
 *  - Prefixes every call with VITE_API_URL (default http://localhost:8000).
 *  - Attaches the JWT access token from localStorage.
 *  - On a 401, transparently tries the refresh token once, then retries.
 *  - Throws ApiError(status, message) on non-2xx so callers can show details.
 */
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const TOKEN_KEY = 'ruralop.tokens'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function getTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY)) || {}
  } catch {
    return {}
  }
}
export function setTokens(t) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
}
export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
}

async function raw(path, { method = 'GET', body, auth = true, isForm = false } = {}) {
  const headers = {}
  if (body && !isForm) headers['Content-Type'] = 'application/json'
  const { access_token } = getTokens()
  if (auth && access_token) headers.Authorization = `Bearer ${access_token}`
  return fetch(BASE + path, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  })
}

async function request(path, opts = {}) {
  let res = await raw(path, opts)

  // Try a single silent refresh on 401.
  if (res.status === 401 && opts.auth !== false) {
    const { refresh_token } = getTokens()
    if (refresh_token) {
      const r = await fetch(BASE + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
      })
      if (r.ok) {
        setTokens(await r.json())
        res = await raw(path, opts)
      } else {
        clearTokens()
      }
    }
  }

  if (!res.ok) {
    let detail = res.statusText
    try {
      const j = await res.json()
      detail = j.detail || detail
    } catch {
      /* non-json error body */
    }
    throw new ApiError(res.status, typeof detail === 'string' ? detail : JSON.stringify(detail))
  }

  if (res.status === 204) return null
  if (opts.blob) return res.blob()
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

export const api = {
  get: (p, o) => request(p, { ...o, method: 'GET' }),
  post: (p, b, o) => request(p, { ...o, method: 'POST', body: b }),
  put: (p, b, o) => request(p, { ...o, method: 'PUT', body: b }),
  del: (p, o) => request(p, { ...o, method: 'DELETE' }),
}
