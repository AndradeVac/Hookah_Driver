import { api } from './api'

export type Flavor = {
  id: string
  brand_id: string
  name: string
  description: string | null
  active: boolean
}

export async function getFlavors() {
  const { data } = await api.get<Flavor[]>('/flavors')
  return data
}

export async function createFlavor(payload: { brand_id: string; name: string; description?: string }) {
  const { data } = await api.post<Flavor>('/flavors', payload)
  return data
}

export async function updateFlavorStatus(id: string, active: boolean) {
  const { data } = await api.patch<Flavor>(`/flavors/${id}`, { active })
  return data
}