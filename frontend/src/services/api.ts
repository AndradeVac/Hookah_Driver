import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api'
const TOKEN_KEY = 'hookah-driver-token'
export const SESSION_EXPIRED_EVENT = 'hookah-driver:session-expired'

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
})

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

// Builds a ws(s):// URL for `path` (e.g. "/public/ws/orders/xyz").
// Absolute VITE_API_URL (production, cross-origin) has no /api prefix on the backend routes;
// the relative "/api" default (local dev) goes through the Vite proxy on the same host.
export function getWebSocketUrl(path: string): string {
  if (/^https?:\/\//.test(apiBaseUrl)) {
    const url = new URL(apiBaseUrl)
    const wsProtocol = url.protocol === 'https:' ? 'wss' : 'ws'
    return `${wsProtocol}://${url.host}${path}`
  }
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/api${path}`
}

/** Extracts the API's `detail` message, falling back to a generic text. */
export function apiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
  }
  return fallback
}

api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && tokenStorage.get()) {
      tokenStorage.clear()
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    }
    return Promise.reject(error)
  },
)
