import { api } from './api'

export type DashboardAnalytics = {
  revenue: string
  order_count: number
  average_ticket: string
  top_product: { product_name: string; quantity: number; revenue: string } | null
  products: Array<{ product_name: string; quantity: number; revenue: string }>
  sales_by_hour: Array<{ hour: number; orders: number; revenue: string }>
  orders_by_status: Array<{ label: string; count: number }>
  orders_by_payment: Array<{ label: string; count: number }>
}

export async function getDashboardAnalytics() {
  const { data } = await api.get<DashboardAnalytics>('/analytics/dashboard')
  return data
}
