  import { AlertCircle, ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react'
  import { useEffect, useMemo, useState } from 'react'
  import { useNavigate, useParams } from 'react-router-dom'
  import { getCustomers, type Customer } from '../../services/customers'
  import { getOrder, updateOrderStatus, type Order } from '../../services/orders'
  import type { OrderStatus } from '../../types'

  const statusSteps: Array<{ status: OrderStatus; label: string }> = [
    { status: 'AWAITING_PAYMENT', label: 'Aguardando pagamento' },
    { status: 'RECEIVED', label: 'Pedido recebido' },
    { status: 'PREPARING', label: 'Em preparo' },
    { status: 'READY', label: 'Pronto' },
    { status: 'FINISHED', label: 'Entregue' },
  ]

  function formatMoney(value: string) {
    return `R$ ${Number(value).toFixed(2).replace('.', ',')}`
  }

  function formatTime(value?: string) {
    return value ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—'
  }

  export function OrderDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [order, setOrder] = useState<Order | null>(null)
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isUpdating, setIsUpdating] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
      if (!id) return
      Promise.all([getOrder(id), getCustomers()])
        .then(([loadedOrder, loadedCustomers]) => {
          setOrder(loadedOrder)
          setCustomer(loadedCustomers.find((item) => item.id === loadedOrder.customer_id) ?? null)
        })
        .catch(() => setError('Não foi possível carregar os detalhes do pedido.'))
        .finally(() => setIsLoading(false))
    }, [id])

    const nextStatus = useMemo(() => {
      if (!order) return undefined
      const currentIndex = statusSteps.findIndex((step) => step.status === order.status)
      return statusSteps[currentIndex + 1]?.status
    }, [order])

    async function advanceStatus() {
      if (!order || !nextStatus) return
      setIsUpdating(true)
      setError('')
      try {
        setOrder(await updateOrderStatus(order.id, nextStatus))
      } catch {
        setError('Não foi possível avançar o pedido.')
      } finally {
        setIsUpdating(false)
      }

    }

    async function cancelOrder() {
      if (!order || !window.confirm('Cancelar este pedido?')) return
      const reason = window.prompt('Informe o motivo do cancelamento:')?.trim()
      if (!reason) return
      setIsUpdating(true)
      setError('')
      try {
        setOrder(await updateOrderStatus(order.id, 'CANCELLED', reason))
      } catch {
        setError('Não foi possível cancelar o pedido.')
      } finally {
        setIsUpdating(false)
      }
    }

    if (isLoading) return <div className="auth-loading"><LoaderCircle className="spin" size={20} />Carregando pedido...</div>
    if (!order) return <section className="page-content simple-page"><div className="api-error"><AlertCircle size={16} />{error || 'Pedido não encontrado.'}</div></section>

    const statusIndex = statusSteps.findIndex((step) => step.status === order.status)
    const historyByStatus = new Map(order.status_history.map((item) => [item.status, item.created_at]))

    return (
      <section className="page-content order-detail-shell">
        <button className="back-link" type="button" onClick={() => navigate('/orders')}><ArrowLeft size={16} /> Voltar para pedidos</button>
        <div className="page-header order-detail-header">
          <div><span className="eyebrow black">OPERAÇÃO CONECTADA</span><div className="header-inline"><h1>Pedido #{order.order_number}</h1><span className="badge badge-warning">{order.status}</span></div><p>Detalhes completos do pedido</p></div>
        </div>
        {error && <div className="api-error"><AlertCircle size={16} />{error}</div>}
        <div className="detail-grid">
          <article className="detail-panel detail-panel-main">
            <div className="customer-name-row">{customer?.name ?? 'Cliente'}</div>
            <div className="chip">Pedido no Lounge · {order.payment_method}</div>
            <div className="payment-proof">
              <span>Comprovante de pagamento</span>
              <strong className={order.payment_status === 'PAID' ? 'status-active' : order.payment_status === 'FAILED' ? 'status-inactive' : ''}>{order.payment_status === 'PAID' ? 'Pago' : order.payment_status === 'FAILED' ? 'Recusado' : 'Pendente'}</strong>
              {order.paid_at && <small>Confirmado em {formatTime(order.paid_at)}</small>}
              {(order.mercado_pago_payment_id || order.mercado_pago_order_id) && <small>Referência Mercado Pago: {order.mercado_pago_payment_id ?? order.mercado_pago_order_id}</small>}
            </div>
            <div className="product-card order-items-detail">
              <h2>Itens do pedido</h2>
              {order.items.map((item) => <div className="detail-item" key={item.product_id}><div><strong>{item.quantity}x {item.product_name}</strong>{item.notes && <span>{item.notes}</span>}</div><b>{formatMoney(item.total_price)}</b></div>)}
            </div>
            <div className="order-total-box"><span>Valor do pedido</span><strong>{formatMoney(order.total)}</strong></div>
            {nextStatus && <button className="primary-button detail-action" type="button" onClick={() => void advanceStatus()} disabled={isUpdating}>{isUpdating ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}{isUpdating ? 'Atualizando...' : `Avançar para ${statusSteps.find((step) => step.status === nextStatus)?.label}`}</button>}
            {order.status !== 'FINISHED' && order.status !== 'CANCELLED' && <button className="danger-button" type="button" onClick={() => void cancelOrder()} disabled={isUpdating}>Cancelar pedido</button>}
          </article>
          <aside className="detail-panel detail-panel-side"><h3>Linha do tempo</h3><ul className="timeline">{statusSteps.map((step, index) => <li key={step.status} className={index <= statusIndex ? 'active' : ''}><span className="dot" /><span className="timeline-label">{step.label}</span><span className="timeline-time">{formatTime(historyByStatus.get(step.status))}</span></li>)}</ul></aside>
        </div>
      </section>
    )
}
