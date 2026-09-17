import { api } from './api'

export type PublicOrderResponse = { order_id: string; order_number: number; status: string; total: string; public_token: string; payment_status: string; checkout_url: string | null }

export type PublicOrderTracking = { order_number: number; status: string; total: string; created_at: string; payment_status: string }
export type PublicHistoryOrder = { order_number: number; status: string; total: string; created_at: string; items: Array<{ product_id: string; product_name: string; quantity: number; notes: string | null }> }

export async function createPublicOrder(payload: {
  customer_name: string
  customer_phone: string
  payment_method: 'PIX' | 'CARD'
  items: Array<{ product_id: string; quantity: number; notes?: string }>
}) {
  const { data } = await api.post<PublicOrderResponse>('/public/orders', payload)
  return data
}

export async function getPublicOrder(publicToken: string) {
  const { data } = await api.get<PublicOrderTracking>(`/public/orders/${publicToken}`)
  return data
}

export async function getPublicOrderHistory(phone: string) {
  const { data } = await api.get<PublicHistoryOrder[]>('/public/history', { params: { phone } })
  return data
}
