import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

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

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hookah-driver-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) localStorage.removeItem('hookah-driver-token')
    return Promise.reject(error)
  },
)
