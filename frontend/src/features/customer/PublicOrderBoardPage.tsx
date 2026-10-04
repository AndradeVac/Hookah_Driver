import { AlertCircle, ArrowLeft, Check, Clock, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatTime } from '../../lib/format'
import { logoImage } from '../../lib/images'
import { apiErrorMessage } from '../../services/api'
import { getPublicOrderBoard, type PublicOrderBoardItem } from '../../services/publicOrders'

const REFRESH_INTERVAL_MS = 2_000
const columns = [
  { status: 'RECEIVED', title: 'Recebidos', icon: Clock },
  { status: 'PREPARING', title: 'Em preparo', icon: LoaderCircle },
  { status: 'READY', title: 'Prontos para retirada', icon: Check },
] as const

export function PublicOrderBoardPage() {
  const [orders, setOrders] = useState<PublicOrderBoardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let timer: number | undefined
    const load = async () => {
      try {
        const loaded = await getPublicOrderBoard()
        if (active) {
          setOrders(loaded)
          setUpdatedAt(new Date().toISOString())
          setError('')
        }
      } catch (err) {
        if (active) setError(apiErrorMessage(err, 'Não foi possível atualizar os pedidos. Tentaremos novamente em instantes.'))
      } finally {
        if (active) {
          setLoading(false)
          timer = window.setTimeout(() => void load(), REFRESH_INTERVAL_MS)
        }
      }
    }
    void load()
    return () => { active = false; window.clearTimeout(timer) }
  }, [])

  return (
    <main className="public-order-board">
      <header className="customer-header">
        <div>
          <img className="customer-logo" {...logoImage} />
          <h1>Acompanhe seu pedido</h1>
          <p>Confira o número do seu pedido. Pagamento no balcão.</p>
        </div>
        <Link className="customer-back" to="/cliente"><ArrowLeft size={16} /> Cardápio</Link>
      </header>
      <p className="customer-muted" role="status">
        Atualização automática a cada 2 segundos{updatedAt && ` · Última atualização: ${formatTime(updatedAt)}`}
      </p>
      {error && <div className="api-error" role="alert"><AlertCircle size={16} />{error}{updatedAt && ' Os dados abaixo podem estar desatualizados.'}</div>}
      {loading ? <div className="resource-state"><LoaderCircle className="spin" size={20} />Carregando pedidos...</div>
        : <div className="public-board-columns">
          {columns.map(({ status, title, icon: Icon }) => {
            const columnOrders = orders.filter((order) => order.status === status)
            return (
              <section className={`public-board-column public-board-${status.toLowerCase()}`} key={status}>
                <div className="orders-column-heading"><h2><Icon size={20} />{title}</h2><span>{columnOrders.length}</span></div>
                <div className="orders-list">
                  {!columnOrders.length && <div className="orders-empty">{error ? 'Aguardando atualização dos pedidos.' : 'Nenhum pedido neste momento.'}</div>}
                  {columnOrders.map((order) => (
                    <article className="public-board-order" key={order.order_number}>
                      <strong>#{order.order_number}</strong>
                      <span>Recebido às {formatTime(order.created_at)}</span>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>}
    </main>
  )
}
