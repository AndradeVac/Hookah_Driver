import { api } from './api'

export type Order = {
  id: string
  order_number: number
  status: string
  total: string
  customer_name: string
  payment_status: string
  created_at: string
}

export async function getOrders() {
  const { data } = await api.get<Order[]>('/admin/orders/tracking')
  return data
}

export async function updateOrderStatus(orderId: string, status: string) {
  const { data } = await api.put(`/admin/orders/${orderId}/status`, { status })
  return data
}
