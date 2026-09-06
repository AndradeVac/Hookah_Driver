import { api } from './api'

export type DashboardAnalytics = {
  revenue: string
  order_count: number
  average_ticket: string
  top_product: { product_name: string; quantity: number; revenue: string } | null
  products: Array<{ product_name: string; quantity: number; revenue: string }>
  essences: Array<{ brand_name: string; flavor_name: string; quantity: number; revenue: string }>
  sales_by_hour: Array<{ hour: number; orders: number; revenue: string }>
  orders_by_status: Array<{ label: string; count: number }>
  orders_by_payment: Array<{ label: string; count: number }>
}

export type AnalyticsPeriod = 'month' | 'quarter' | 'all'

export async function getDashboardAnalytics(period: AnalyticsPeriod) {
  const { data } = await api.get<DashboardAnalytics>('/analytics/dashboard', { params: { period } })
  return data
}

export async function downloadDashboardExport(period: AnalyticsPeriod, format: 'xlsx' | 'pdf') {
  const response = await api.get<Blob>('/analytics/dashboard/export', { params: { period, format }, responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = `hookah-dashboard-${period}.${format}`
  link.click()
  URL.revokeObjectURL(url)
}
