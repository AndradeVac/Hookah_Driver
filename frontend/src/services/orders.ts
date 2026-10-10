import { api } from './api'
import type { OrderStatus, PaymentMethod, PaymentStatus } from '../types'

export type OrderItem = {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: string
  total_price: string
  notes: string | null
}

export type Order = {
  id: string
  order_number: number
  customer_id: string
  customer_name: string | null
  status: OrderStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  paid_at: string | null
  mercado_pago_order_id: string | null
  mercado_pago_payment_id: string | null
  subtotal: string
  total: string
  created_at: string
  updated_at: string
  items: OrderItem[]
  status_history: Array<{
    status: OrderStatus
    changed_by_user_id: string | null
    created_at: string
    reason: string | null
  }>
}

export type NewOrderItem = { product_id: string; quantity: number; notes?: string }

export async function getOrders() {
  const { data } = await api.get<Order[]>('/orders')
  return data
}

export async function getOrder(id: string) {
  const { data } = await api.get<Order>(`/orders/${id}`)
  return data
}

export async function createOrder(payload: { customer_id: string; payment_method: PaymentMethod; items: NewOrderItem[] }) {
  const { data } = await api.post<Order>('/orders', payload)
  return data
}

export async function updateOrderStatus(id: string, status: OrderStatus, reason?: string) {
  const { data } = await api.patch<Order>(`/orders/${id}/status`, { status, reason })
  return data
}

export async function deleteOrder(id: string) {
  await api.delete(`/orders/${id}`)
}

export async function deleteAllOrders() {
  const { data } = await api.delete<{ deleted_count: number }>('/orders')
  return data
}
