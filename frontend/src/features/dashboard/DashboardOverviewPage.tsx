import { AlertCircle, ArrowUpRight, BarChart3, ChartColumnBig, LoaderCircle, ShoppingCart, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getOrders, type Order } from '../../services/orders'

function formatMoney(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

export function DashboardOverviewPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getOrders().then(setOrders).catch(() => setError('Não foi possível carregar os indicadores.')).finally(() => setIsLoading(false))
  }, [])

  const revenue = orders.reduce((total, order) => total + Number(order.total), 0)
  const averageTicket = orders.length ? revenue / orders.length : 0
  const productRanking = useMemo(() => {
    const totals = new Map<string, number>()
    orders.forEach((order) => order.items.forEach((item) => totals.set(item.product_name, (totals.get(item.product_name) ?? 0) + item.quantity)))
    return [...totals.entries()].sort(([, first], [, second]) => second - first).slice(0, 3)
  }, [orders])
  const hourCounts = new Map<number, number>()
  orders.forEach((order) => {
    const hour = new Date(order.created_at).getHours()
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)
  })
  const lastHour = orders.length ? Math.max(...orders.map((order) => new Date(order.created_at).getHours())) : new Date().getHours()
  const hours = Array.from({ length: 6 }, (_, index) => (lastHour - 5 + index + 24) % 24)
  const maxHourlyOrders = Math.max(...hours.map((hour) => hourCounts.get(hour) ?? 0), 1)
  const metrics = [
    { label: 'Faturamento', value: formatMoney(revenue), delta: `${orders.length} pedidos no período`, icon: ShoppingCart },
    { label: 'Pedidos', value: String(orders.length), delta: 'Pedidos registrados', icon: BarChart3 },
    { label: 'Ticket médio', value: formatMoney(averageTicket), delta: 'Média por pedido', icon: ChartColumnBig },
    { label: 'Mais vendido', value: productRanking[0]?.[0] ?? 'Sem dados', delta: productRanking[0] ? `${productRanking[0][1]} unidades` : 'Aguardando pedidos', icon: Users },
  ]

  return (
    <section className="page-content dashboard-tech-shell">
      <div className="page-header dashboard-header">
        <div>
          <span className="eyebrow black">HOOKAH DRIVE</span>
          <h1>Visão do Lounge</h1>
          <p>Resumo de desempenho</p>
        </div>
      </div>

      {error && <div className="api-error"><AlertCircle size={16} />{error}</div>}

      <div className="metrics-grid">
        {metrics.map(({ label, value, delta, icon: Icon }) => (
          <article key={label} className="metric-tech-card">
            <div className="metric-card-top">
              <span>{label}</span>
              <div className="metric-icon"><Icon size={17} /></div>
            </div>
            <strong>{isLoading ? <LoaderCircle className="spin" size={22} /> : value}</strong>
            <small>{delta}</small>
          </article>
        ))}
      </div>

      <div className="analytics-grid">
        <article className="chart-card">
          <h3>Vendas por horário</h3>
          <div className="bars">
            {hours.map((hour) => (
              <div key={hour} className="bar-wrap">
                <span className="bar" style={{ height: `${Math.max(10, ((hourCounts.get(hour) ?? 0) / maxHourlyOrders) * 100)}%` }} />
                <small>{hour}h</small>
              </div>
            ))}
          </div>
        </article>

        <article className="rank-card">
          <h3>Produtos mais vendidos</h3>
          <ol>{productRanking.length === 0 ? <li><span className="rank-name">Nenhum produto vendido</span></li> : productRanking.map(([name, quantity], index) => <li key={name}><span className="rank-name">{index + 1}. {name}</span><strong className="rank-total">{quantity} un.</strong></li>)}</ol>
        </article>
      </div>

      <div className="insight-banner">
        <ArrowUpRight size={16} />
        <div>
          <strong>Dados para decidir melhor.</strong>
          <p>Entenda o que vende e quando o Lounge tem maior movimento.</p>
        </div>
      </div>
    </section>
  )
}
