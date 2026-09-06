import { api } from './api'

export type Customer = {
  id: string
  name: string
  phone: string | null
  active: boolean
}

export async function getCustomers() {
  const { data } = await api.get<Customer[]>('/customers')
  return data
}
