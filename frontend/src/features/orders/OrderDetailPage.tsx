import { AlertCircle, ArrowLeft, ArrowRight, Ban, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { formatMoney, formatTime, orderStatusLabels, paymentMethodLabels } from '../../lib/format'
import { apiErrorMessage } from '../../services/api'
import { getOrder, updateOrderStatus, type Order } from '../../services/orders'
import type { OrderStatus } from '../../types'

const FLOW: OrderStatus[] = ['AWAITING_PAYMENT', 'RECEIVED', 'PREPARING', 'READY', 'FINISHED']

const paymentStatusLabels = { PAID: 'Pago', FAILED: 'Recusado', PENDING: 'Pendente' }

export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    if (!id) return
    getOrder(id)
      .then(setOrder)
      .catch(() => setError('Não foi possível carregar os detalhes do pedido.'))
      .finally(() => setIsLoading(false))
  }, [id])

  // Orders created by staff or paid in cash never go through "awaiting payment".
  const steps = useMemo(() => {
    if (!order) return FLOW
    const visitedPayment = order.status_history.some((entry) => entry.status === 'AWAITING_PAYMENT')
    return visitedPayment ? FLOW : FLOW.slice(1)
  }, [order])

  const nextStatus = useMemo(() => {
    if (!order) return undefined
    if (order.status === 'AWAITING_PAYMENT' && order.payment_status !== 'PAID') return undefined
    const currentIndex = steps.indexOf(order.status)
    return currentIndex >= 0 ? steps[currentIndex + 1] : undefined
  }, [order, steps])

  async function changeStatus(status: OrderStatus, reason?: string) {
    if (!order) return
    setIsUpdating(true)
    setError('')
    try {
      setOrder(await updateOrderStatus(order.id, status, reason))
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível atualizar o pedido.'))
    } finally {
      setIsUpdating(false)
    }
  }

  async function confirmCancel() {
    const reason = cancelReason.trim()
    if (!reason) return
    await changeStatus('CANCELLED', reason)
    setCancelOpen(false)
    setCancelReason('')
  }

  if (isLoading) return <div className="auth-loading"><LoaderCircle className="spin" size={20} />Carregando pedido...</div>
  if (!order) return <section className="page-content simple-page"><div className="api-error"><AlertCircle size={16} />{error || 'Pedido não encontrado.'}</div></section>

  const statusIndex = steps.indexOf(order.status)
  const historyByStatus = new Map(order.status_history.map((item) => [item.status, item.created_at]))
  const cancellation = order.status_history.find((item) => item.status === 'CANCELLED')

  return (
    <section className="page-content order-detail-shell">
      {cancelOpen && (
        <ConfirmDialog
          icon={<Ban size={28} />}
          title={`Cancelar o pedido #${order.order_number}?`}
          description="Informe o motivo. Ele fica registrado no histórico do pedido."
          confirmLabel="Cancelar pedido"
          busyLabel="Cancelando..."
          cancelLabel="Voltar"
          isBusy={isUpdating}
          confirmDisabled={!cancelReason.trim()}
          onConfirm={() => void confirmCancel()}
          onCancel={() => { setCancelOpen(false); setCancelReason('') }}
        >
          <textarea className="modal-textarea" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Ex.: cliente desistiu" maxLength={200} rows={3} aria-label="Motivo do cancelamento" />
        </ConfirmDialog>
      )}
      <button className="back-link" type="button" onClick={() => navigate('/orders')}><ArrowLeft size={16} /> Voltar para pedidos</button>
      <div className="page-header order-detail-header">
        <div><span className="eyebrow black">OPERAÇÃO CONECTADA</span><div className="header-inline"><h1>Pedido #{order.order_number}</h1><span className={`badge ${order.status === 'CANCELLED' ? 'badge-danger' : order.status === 'FINISHED' ? 'badge-success' : 'badge-warning'}`}>{orderStatusLabels[order.status]}</span></div><p>{formatTime(order.created_at)} · {paymentMethodLabels[order.payment_method] ?? order.payment_method}</p></div>
      </div>
      {error && <div className="api-error"><AlertCircle size={16} />{error}</div>}
      <div className="detail-grid">
        <article className="detail-panel detail-panel-main">
          <div className="customer-name-row">{order.customer_name ?? 'Cliente'}</div>
          <div className="chip">Pedido no Lounge · {paymentMethodLabels[order.payment_method] ?? order.payment_method}</div>
          <div className="payment-proof">
            <span>Pagamento</span>
            <strong className={order.payment_status === 'PAID' ? 'status-active' : order.payment_status === 'FAILED' ? 'status-inactive' : ''}>{paymentStatusLabels[order.payment_status]}</strong>
            {order.paid_at && <small>Confirmado às {formatTime(order.paid_at)}</small>}
            {(order.mercado_pago_payment_id || order.mercado_pago_order_id) && <small>Referência Mercado Pago: {order.mercado_pago_payment_id ?? order.mercado_pago_order_id}</small>}
          </div>
          <div className="product-card order-items-detail">
            <h2>Itens do pedido</h2>
            {order.items.map((item) => <div className="detail-item" key={item.id}><div><strong>{item.quantity}x {item.product_name}</strong>{item.notes && <span>{item.notes}</span>}</div><b>{formatMoney(item.total_price)}</b></div>)}
          </div>
          <div className="order-total-box"><span>Valor do pedido</span><strong>{formatMoney(order.total)}</strong></div>
          {cancellation?.reason && <div className="api-error"><AlertCircle size={16} />Cancelado: {cancellation.reason}</div>}
          {nextStatus && <button className="primary-button detail-action" type="button" onClick={() => void changeStatus(nextStatus)} disabled={isUpdating}>{isUpdating ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}{isUpdating ? 'Atualizando...' : `Avançar para ${orderStatusLabels[nextStatus]}`}</button>}
          {order.status !== 'FINISHED' && order.status !== 'CANCELLED' && <button className="danger-button detail-cancel" type="button" onClick={() => setCancelOpen(true)} disabled={isUpdating}><Ban size={16} />Cancelar pedido</button>}
        </article>
        <aside className="detail-panel detail-panel-side"><h3>Linha do tempo</h3><ul className="timeline">{steps.map((status, index) => <li key={status} className={index <= statusIndex ? 'active' : ''}><span className="dot" /><span className="timeline-label">{orderStatusLabels[status]}</span><span className="timeline-time">{formatTime(historyByStatus.get(status))}</span></li>)}</ul></aside>
      </div>
    </section>
  )
}
