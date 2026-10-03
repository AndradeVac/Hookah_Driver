import type { OrderStatus } from '../types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

export function formatMoney(value: string | number) {
  return currency.format(Number(value))
}

export function formatTime(value?: string | null) {
  return value ? time.format(new Date(value)) : '—'
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  RECEIVED: 'Recebido',
  PREPARING: 'Em preparo',
  READY: 'Pronto',
  FINISHED: 'Entregue',
  CANCELLED: 'Cancelado',
}

export const paymentMethodLabels: Record<string, string> = { PIX: 'PIX', CARD: 'Cartão', CASH: 'Dinheiro' }
