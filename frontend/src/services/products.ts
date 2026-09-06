import { api } from './api'

export type Product = {
  id: string
  category_id: string
  flavor_id: string | null
  name: string
  description: string | null
  price: string
  active: boolean
}

export async function getProducts() {
  const { data } = await api.get<Product[]>('/products')
  return data
}
