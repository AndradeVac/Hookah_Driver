import { api } from './api'

export type Category = {
  id: string
  name: string
  image_url: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export async function getCategories() {
  const { data } = await api.get<Category[]>('/categories')
  return data
}

export async function createCategory(name: string) {
  const { data } = await api.post<Category>('/categories', { name })
  return data
}

export async function updateCategoryStatus(id: string, active: boolean) {
  const { data } = await api.patch<Category>(`/categories/${id}`, { active })
  return data
}
