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

export async function createCustomer(payload: { name: string; phone?: string }) {
  const { data } = await api.post<Customer>('/customers', payload)
  return data
}

export async function updateCustomerStatus(id: string, active: boolean) {
  const { data } = await api.patch<Customer>(`/customers/${id}`, { active })
  return data
}
