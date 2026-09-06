import { AlertCircle, ArrowUpRight, BarChart3, ChartColumnBig, CreditCard, LoaderCircle, ShoppingCart, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getDashboardAnalytics, type DashboardAnalytics } from '../../services/analytics'

function formatMoney(value: string) {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`
}

const statusLabels: Record<string, string> = { RECEIVED: 'Novos', PREPARING: 'Em preparo', READY: 'Prontos', FINISHED: 'Finalizados', CANCELLED: 'Cancelados' }
const paymentLabels: Record<string, string> = { PIX: 'PIX', CARD: 'Cartão', CASH: 'Dinheiro' }

export function DashboardOverviewPage() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboardAnalytics().then(setAnalytics).catch(() => setError('Não foi possível carregar os indicadores.')).finally(() => setIsLoading(false))
  }, [])

  const metrics = [
    { label: 'Faturamento', value: analytics ? formatMoney(analytics.revenue) : '', delta: analytics ? `${analytics.order_count} pedidos no período` : '', icon: ShoppingCart },
    { label: 'Pedidos', value: analytics ? String(analytics.order_count) : '', delta: 'Pedidos registrados', icon: BarChart3 },
    { label: 'Ticket médio', value: analytics ? formatMoney(analytics.average_ticket) : '', delta: 'Média por pedido', icon: ChartColumnBig },
    { label: 'Mais vendido', value: analytics?.top_product?.product_name ?? 'Sem dados', delta: analytics?.top_product ? `${analytics.top_product.quantity} unidades` : 'Aguardando pedidos', icon: Users },
  ]
  const maxHourlyOrders = Math.max(...(analytics?.sales_by_hour.map((item) => item.orders) ?? [1]), 1)
  const maxStatusCount = Math.max(...(analytics?.orders_by_status.map((item) => item.count) ?? [1]), 1)
  const maxPaymentCount = Math.max(...(analytics?.orders_by_payment.map((item) => item.count) ?? [1]), 1)

  return (
    <section className="page-content dashboard-tech-shell">
      <div className="page-header dashboard-header"><div><span className="eyebrow black">HOOKAH DRIVE</span><h1>Visão do Lounge</h1><p>Resumo de desempenho</p></div></div>
      {error && <div className="api-error"><AlertCircle size={16} />{error}</div>}
      <div className="metrics-grid">{metrics.map(({ label, value, delta, icon: Icon }) => <article key={label} className="metric-tech-card"><div className="metric-card-top"><span>{label}</span><div className="metric-icon"><Icon size={17} /></div></div><strong>{isLoading ? <LoaderCircle className="spin" size={22} /> : value}</strong><small>{delta}</small></article>)}</div>
      <div className="analytics-grid">
        <article className="chart-card"><div className="chart-heading"><div><h3>Vendas por horário</h3><span>Pedidos agrupados pelo horário de criação</span></div><BarChart3 size={17} /></div><div className="bars">{isLoading ? <div className="resource-state"><LoaderCircle className="spin" size={18} />Carregando gráfico...</div> : analytics?.sales_by_hour.length ? analytics.sales_by_hour.map((item) => <div key={item.hour} className="bar-wrap"><span className="bar" style={{ height: `${Math.max(12, (item.orders / maxHourlyOrders) * 100)}%` }} /><small>{item.hour}h</small></div>) : <div className="resource-state">Sem vendas no período.</div>}</div></article>
        <article className="rank-card"><div className="chart-heading"><div><h3>Produtos mais vendidos</h3><span>Quantidade vendida</span></div><ShoppingCart size={17} /></div><ol>{analytics?.products.length ? analytics.products.slice(0, 5).map((item, index) => <li key={item.product_name}><span className="rank-name">{index + 1}. {item.product_name}</span><strong className="rank-total">{item.quantity} un.</strong></li>) : <li><span className="rank-name">Nenhum produto vendido</span></li>}</ol></article>
      </div>
      <div className="analytics-grid dashboard-breakdowns">
        <article className="breakdown-card"><div className="chart-heading"><div><h3>Status dos pedidos</h3><span>Distribuição operacional</span></div><ArrowUpRight size={17} /></div><div className="breakdown-list">{analytics?.orders_by_status.map((item) => <div className="breakdown-row" key={item.label}><div><span>{statusLabels[item.label] ?? item.label}</span><strong>{item.count}</strong></div><i><b style={{ width: `${(item.count / maxStatusCount) * 100}%` }} /></i></div>)}</div></article>
        <article className="breakdown-card"><div className="chart-heading"><div><h3>Meios de pagamento</h3><span>Pedidos por modalidade</span></div><CreditCard size={17} /></div><div className="breakdown-list">{analytics?.orders_by_payment.map((item) => <div className="breakdown-row" key={item.label}><div><span>{paymentLabels[item.label] ?? item.label}</span><strong>{item.count}</strong></div><i><b className="payment-bar" style={{ width: `${(item.count / maxPaymentCount) * 100}%` }} /></i></div>)}</div></article>
      </div>
      <div className="insight-banner"><ArrowUpRight size={16} /><div><strong>Dados para decidir melhor.</strong><p>Indicadores calculados no backend para manter o painel leve mesmo com alto volume.</p></div></div>
    </section>
  )
}
