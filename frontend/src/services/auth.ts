import { api } from './api'

export type LoginPayload = { username: string; password: string }
export type TokenResponse = { access_token: string; token_type: string }

export async function login(payload: LoginPayload) {
  const form = new URLSearchParams()
  form.set('username', payload.username)
  form.set('password', payload.password)
  const { data } = await api.post<TokenResponse>('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  localStorage.setItem('hookah-driver-token', data.access_token)
  return data
}

export function logout() {
  localStorage.removeItem('hookah-driver-token')
}
