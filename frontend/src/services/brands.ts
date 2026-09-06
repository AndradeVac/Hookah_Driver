import { api } from './api'

export type Brand = {
  id: string
  name: string
  active: boolean
  created_at: string
  updated_at: string
}

export async function getBrands() {
  const { data } = await api.get<Brand[]>('/brands')
  return data
}

export async function createBrand(name: string) {
  const { data } = await api.post<Brand>('/brands', { name })
  return data
}

export async function deleteBrand(id: string) {
  const { data } = await api.delete<Brand>(`/brands/${id}`)
  return data
}

export async function updateBrandStatus(id: string, active: boolean) {
  const { data } = await api.patch<Brand>(`/brands/${id}`, { active })
  return data
}
