import { api } from './api'

export type PublicOrderResponse = { order_id: string; order_number: number; status: string; total: string; public_token: string }

export type PublicOrderTracking = { order_number: number; status: string; total: string; created_at: string }

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
