import { AlertCircle, ArrowRight, LoaderCircle, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { formatMoney, formatTime, paymentMethodLabels } from '../../lib/format'
import { apiErrorMessage } from '../../services/api'
import { deleteAllOrders, deleteOrder, getOrders, updateOrderStatus, type Order } from '../../services/orders'
import type { OrderStatus } from '../../types'

const REFRESH_INTERVAL_MS = 2_000

const columns: Array<{ status: OrderStatus; title: string; next?: OrderStatus; action?: string }> = [
  { status: 'AWAITING_PAYMENT', title: 'AGUARDANDO PAGAMENTO' },
  { status: 'RECEIVED', title: 'NOVOS', next: 'PREPARING', action: 'Aceitar pedido' },
  { status: 'PREPARING', title: 'EM PREPARO', next: 'READY', action: 'Marcar como pronto' },
  { status: 'READY', title: 'PRONTOS', next: 'FINISHED', action: 'Entregar' },
  { status: 'FINISHED', title: 'FINALIZADOS' },
  { status: 'CANCELLED', title: 'CANCELADOS' },
]

type DeleteTarget = Order | 'ALL'

export function OrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL')
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let active = true
    const loadBoard = () => getOrders()
      .then((loaded) => { if (active) { setOrders(loaded); setError('') } })
      .catch(() => { if (active) setError('Não foi possível carregar os pedidos.') })
      .finally(() => { if (active) setIsLoading(false) })

    void loadBoard()
    const refresh = window.setInterval(() => void loadBoard(), REFRESH_INTERVAL_MS)
    return () => { active = false; window.clearInterval(refresh) }
  }, [])

  async function advanceOrder(order: Order, nextStatus?: OrderStatus) {
    if (!nextStatus) return
    setUpdatingId(order.id)
    setError('')
    try {
      const updatedOrder = await updateOrderStatus(order.id, nextStatus)
      setOrders((current) => current.map((item) => item.id === order.id ? updatedOrder : item))
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível atualizar o status do pedido.'))
    } finally {
      setUpdatingId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    setError('')
    try {
      if (deleteTarget === 'ALL') {
        const result = await deleteAllOrders()
        setOrders([])
        toast.success(`${result.deleted_count} pedido(s) removido(s).`)
      } else {
        await deleteOrder(deleteTarget.id)
        const removedId = deleteTarget.id
        setOrders((current) => current.filter((item) => item.id !== removedId))
        toast.success(`Pedido #${deleteTarget.order_number} removido.`)
      }
      setDeleteTarget(null)
    } catch (err) {
      setError(apiErrorMessage(err, deleteTarget === 'ALL' ? 'Não foi possível limpar os pedidos.' : 'Não foi possível remover o pedido.'))
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const searchable = `${order.order_number} ${order.customer_name ?? ''} ${order.items.map((item) => item.product_name).join(' ')}`.toLowerCase()
    return (statusFilter === 'ALL' || order.status === statusFilter) && searchable.includes(search.toLowerCase())
  }), [orders, search, statusFilter])

  const hasFilters = Boolean(search) || statusFilter !== 'ALL'
  const deleteAll = deleteTarget === 'ALL'
  const boardColumns = columns.filter((column) => column.status !== 'CANCELLED' || orders.some((order) => order.status === 'CANCELLED'))

  return (
    <section className="page-content orders-page-shell">
      <div className="page-header orders-header">
        <div className="orders-header-title">
          <span className="eyebrow">Operação conectada</span>
          <h1>Pedidos</h1>
          <p>Atualizado automaticamente a cada 2 segundos</p>
        </div>
        <div className="orders-header-actions">
          <div className="pill-status">{orders.length} {orders.length === 1 ? 'pedido recente' : 'pedidos recentes'}</div>
          {orders.length > 0 && (
            <button className="orders-clear-button" type="button" onClick={() => setDeleteTarget('ALL')}>
              <Trash2 size={16} />
              Limpar todos
            </button>
          )}
          <button className="primary-button orders-new-button" type="button" onClick={() => navigate('/orders/new')}>
            <Plus size={18} />
            Novo pedido
          </button>
        </div>
      </div>

      {error && <div className="api-error"><AlertCircle size={16} />{error}</div>}

      {deleteTarget && (
        <ConfirmDialog
          icon={<Trash2 size={28} />}
          title={deleteAll ? 'Remover todos os pedidos?' : `Remover o pedido #${deleteTarget.order_number}?`}
          description={deleteAll
            ? <>Você está prestes a remover <strong>{orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}</strong>. Esta ação não pode ser desfeita.</>
            : <>O pedido de <strong>{deleteTarget.customer_name ?? 'Cliente'}</strong> será removido. Esta ação não pode ser desfeita.</>}
          confirmLabel={deleteAll ? 'Remover todos' : 'Remover pedido'}
          busyLabel="Removendo..."
          isBusy={isDeleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="orders-filters">
        <label>
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pedido, cliente ou produto" aria-label="Buscar pedidos" />
        </label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filtrar pedidos por status">
          <option value="ALL">Todos os status</option>
          <option value="AWAITING_PAYMENT">Aguardando pagamento</option>
          <option value="RECEIVED">Novos</option>
          <option value="PREPARING">Em preparo</option>
          <option value="READY">Prontos</option>
          <option value="FINISHED">Finalizados</option>
          <option value="CANCELLED">Cancelados</option>
        </select>
        {hasFilters && <button type="button" onClick={() => { setSearch(''); setStatusFilter('ALL') }}><X size={14} /> Limpar filtros</button>}
      </div>

      {isLoading ? <div className="resource-state"><LoaderCircle className="spin" size={20} />Carregando pedidos...</div> : <div className="orders-columns">
        {boardColumns.map((column) => {
          const columnOrders = filteredOrders.filter((order) => order.status === column.status)
          return <div key={column.status} className="orders-column">
            <div className="orders-column-heading"><h3>{column.title}</h3><span>{columnOrders.length}</span></div>
            <div className="orders-list">
              {columnOrders.length === 0 ? (
                <div className="orders-empty">Nenhum pedido</div>
              ) : (
                columnOrders.map((order) => {
                  const isBusy = updatingId === order.id
                  return (
                    <article
                      key={order.id}
                      className={`order-card order-card-${column.status.toLowerCase()}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      onKeyDown={(event) => {
                        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                          event.preventDefault()
                          navigate(`/orders/${order.id}`)
                        }
                      }}
                    >
                      <div className="order-topline">
                        <span className="order-number">#{order.order_number}</span>
                        <span className="order-place">{formatTime(order.created_at)}</span>
                      </div>
                      <span className="order-user">{order.customer_name ?? 'Cliente'}</span>
                      <ul className="order-items">
                        {order.items.map((item) => (
                          <li key={item.id}><span className="order-item-qty">{item.quantity}x</span><span className="order-item-name">{item.product_name}</span></li>
                        ))}
                      </ul>
                      <div className="order-meta">
                        <span className="order-price">{formatMoney(order.total)}</span>
                        <span className="order-payment">{paymentMethodLabels[order.payment_method] ?? order.payment_method}</span>
                      </div>
                      <div className="order-actions">
                        {column.next && (
                          <button
                            type="button"
                            className={`order-action order-action-${column.status.toLowerCase()}`}
                            onClick={(event) => { event.stopPropagation(); void advanceOrder(order, column.next) }}
                            disabled={isBusy}
                          >
                            {isBusy ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}
                            {isBusy ? 'Atualizando...' : column.action}
                          </button>
                        )}
                        <button
                          type="button"
                          className="order-action-delete"
                          onClick={(event) => { event.stopPropagation(); setDeleteTarget(order) }}
                          disabled={isBusy}
                          title="Remover pedido"
                          aria-label={`Remover pedido #${order.order_number}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </div>
        })}
      </div>}
    </section>
  )
}
