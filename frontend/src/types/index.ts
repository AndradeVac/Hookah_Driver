export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'FINISHED' | 'CANCELLED'

export type Metric = {
  label: string
  value: string
  note: string
  trend?: string
}

export type OrderSummary = {
  id: string
  orderNumber: string
  customer: string
  items: string
  total: string
  status: OrderStatus
  time: string
}
