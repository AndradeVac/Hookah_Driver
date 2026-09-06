import { AlertCircle, ArrowRight, LoaderCircle, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomers, type Customer } from '../../services/customers'
import { getOrders, updateOrderStatus, type Order } from '../../services/orders'
import type { OrderStatus } from '../../types'

const columns: Array<{ status: OrderStatus; title: string; next?: OrderStatus; action?: string }> = [
  { status: 'RECEIVED', title: 'NOVOS', next: 'PREPARING', action: 'Aceitar pedido' },
  { status: 'PREPARING', title: 'EM PREPARO', next: 'READY', action: 'Marcar como pronto' },
  { status: 'READY', title: 'PRONTOS', next: 'FINISHED', action: 'Entregar' },
  { status: 'FINISHED', title: 'FINALIZADOS' },
]

function formatMoney(value: string) {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function OrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getOrders(), getCustomers()])
      .then(([loadedOrders, loadedCustomers]) => {
        setOrders(loadedOrders)
        setCustomers(loadedCustomers)
      })
      .catch(() => setError('Não foi possível carregar os pedidos.'))
      .finally(() => setIsLoading(false))
  }, [])

  async function advanceOrder(order: Order, nextStatus?: OrderStatus) {
    if (!nextStatus) return
    setUpdatingId(order.id)
    setError('')
    try {
      const updatedOrder = await updateOrderStatus(order.id, nextStatus)
      setOrders((current) => current.map((item) => item.id === order.id ? updatedOrder : item))
    } catch {
      setError('Não foi possível atualizar o status do pedido.')
    } finally {
      setUpdatingId(null)
    }
  }

  const customerNames = useMemo(() => new Map(customers.map((customer) => [customer.id, customer.name])), [customers])
  const totalOrders = orders.length

  return (
    <section className="page-content orders-page-shell">
      <div className="page-header orders-header">
        <div><span className="eyebrow">Operação conectada</span><h1>Pedidos</h1><p>Operação em tempo real</p></div>
        <button className="primary-button orders-new-button" type="button" onClick={() => navigate('/orders/new')}><Plus size={16} /> Novo pedido</button>
        <div className="pill-status">Hoje · {totalOrders} {totalOrders === 1 ? 'pedido' : 'pedidos'}</div>
      </div>
      {error && <div className="api-error"><AlertCircle size={16} />{error}</div>}
      {isLoading ? <div className="resource-state"><LoaderCircle className="spin" size={20} />Carregando pedidos...</div> : <div className="orders-columns">
        {columns.map((column) => {
          const columnOrders = orders.filter((order) => order.status === column.status)
          return <div key={column.status} className="orders-column">
            <div className="orders-column-heading"><h3>{column.title}</h3><span>{columnOrders.length}</span></div>
            <div className="orders-list">
              {columnOrders.length === 0 ? <div className="orders-empty">Nenhum pedido</div> : columnOrders.map((order) => (
                <article key={order.id} className={`order-card order-card-${column.status.toLowerCase()}`}>
                  <div className="order-topline"><span className="order-number">#{order.order_number}</span><span className="order-user">{customerNames.get(order.customer_id) ?? 'Cliente'}</span><span className="order-place">{formatTime(order.created_at)}</span></div>
                  <div className="order-product"><span className="product-tag">{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</span><span className="product-name">{order.items.map((item) => `${item.quantity}x ${item.product_name}`).join(', ')}</span></div>
                  <div className="order-meta"><span className="order-price">{formatMoney(order.total)}</span><span>{order.payment_method}</span></div>
                  {column.next && <button className={`order-action order-action-${column.status.toLowerCase()}`} onClick={() => void advanceOrder(order, column.next)} disabled={updatingId === order.id}>{updatingId === order.id ? <LoaderCircle className="spin" size={15} /> : <ArrowRight size={15} />}{updatingId === order.id ? 'Atualizando...' : column.action}</button>}
                </article>
              ))}
            </div>
          </div>
        })}
      </div>}
    </section>
  )
}
