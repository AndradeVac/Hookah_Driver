import { api } from './api'

export type Product = {
  id: string
  category_id: string
  flavor_id: string | null
  name: string
  description: string | null
  price: string
  active: boolean
  created_at?: string
  updated_at?: string
}

export async function getProducts() {
  const { data } = await api.get<Product[]>('/products')
  return data
}

export async function createProduct(payload: {
  category_id: string
  flavor_id?: string
  name: string
  description?: string
  price: string
}) {
  const { data } = await api.post<Product>('/products', payload)
  return data
}

export async function updateProductStatus(id: string, active: boolean) {
  const { data } = await api.patch<Product>(`/products/${id}`, { active })
  return data
}

export async function updateProduct(id: string, payload: Partial<Pick<Product, 'name' | 'description' | 'price' | 'category_id' | 'flavor_id'>>) {
  const { data } = await api.patch<Product>(`/products/${id}`, payload)
  return data
}
