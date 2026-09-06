import { api } from './api'

export type PublicOrderResponse = { order_id: string; order_number: number; status: string; total: string }

export async function createPublicOrder(payload: {
  customer_name: string
  customer_phone: string
  payment_method: 'PIX' | 'CARD'
  items: Array<{ product_id: string; quantity: number }>
}) {
  const { data } = await api.post<PublicOrderResponse>('/public/orders', payload)
  return data
}
