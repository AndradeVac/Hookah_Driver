import { api } from './api'

export type AppUser = { id: string; name: string; email: string; role: 'ADMIN' | 'OPERATOR'; active: boolean }

export async function getUsers() {
  const { data } = await api.get<AppUser[]>('/users')
  return data
}

export async function createUser(payload: { name: string; email: string; password: string; role: 'ADMIN' | 'OPERATOR' }) {
  const { data } = await api.post<AppUser>('/users', payload)
  return data
}

export async function updateUserStatus(id: string, active: boolean) {
  const { data } = await api.patch<AppUser>(`/users/${id}/status`, { active })
  return data
}