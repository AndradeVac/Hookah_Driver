import { api } from './api'
import type { OrderStatus } from '../types'

export type Order = {
  id: string
  order_number: number
  customer_id: string
  status: OrderStatus
  payment_method: 'PIX' | 'CARD' | 'CASH'
  subtotal: string
  total: string
}

export async function getOrders() {
  const { data } = await api.get<Order[]>('/orders')
  return data
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const { data } = await api.patch<Order>(`/orders/${id}/status`, { status })
  return data
}
