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
  created_at: string
  updated_at: string
  items: Array<{
    product_id: string
    product_name: string
    quantity: number
    unit_price: string
    total_price: string
    notes: string | null
  }>
  status_history: Array<{
    status: OrderStatus
    changed_by_user_id: string | null
    created_at: string
  }>
}

export async function getOrders() {
  const { data } = await api.get<Order[]>('/orders')
  return data
}

export async function getOrder(id: string) {
  const { data } = await api.get<Order>(`/orders/${id}`)
  return data
}

export async function createOrder(payload: {
  customer_id: string
  payment_method: 'PIX' | 'CARD' | 'CASH'
  items: Array<{ product_id: string; quantity: number }>
}) {
  const { data } = await api.post<Order>('/orders', payload)
  return data
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const { data } = await api.patch<Order>(`/orders/${id}/status`, { status })
  return data
}
