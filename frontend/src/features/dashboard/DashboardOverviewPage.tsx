import { AlertCircle, ArrowUpRight, BarChart3, ChartColumnBig, CreditCard, Flame, LoaderCircle, ShoppingCart, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { downloadDashboardExport, getDashboardAnalytics, type AnalyticsPeriod, type DashboardAnalytics } from '../../services/analytics'

function formatMoney(value: string) {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`
}

const statusLabels: Record<string, string> = { RECEIVED: 'Novos', PREPARING: 'Em preparo', READY: 'Prontos', FINISHED: 'Finalizados', CANCELLED: 'Cancelados' }
const paymentLabels: Record<string, string> = { PIX: 'PIX', CARD: 'Cartão', CASH: 'Dinheiro' }

export function DashboardOverviewPage() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setIsLoading(true)
    getDashboardAnalytics(period, customStart ? `${customStart}T00:00:00Z` : undefined, customEnd ? `${customEnd}T23:59:59Z` : undefined).then(setAnalytics).catch(() => setError('Não foi possível carregar os indicadores.')).finally(() => setIsLoading(false))
  }, [period, customStart, customEnd])

  async function exportDashboard(format: 'xlsx' | 'pdf') {
    setIsExporting(true)
    setError('')
    try {
      await downloadDashboardExport(period, format)
    } catch {
      setError('Não foi possível exportar o dashboard.')
    } finally {
      setIsExporting(false)
    }
  }

  const metrics = [
    { label: 'Faturamento', value: analytics ? formatMoney(analytics.revenue) : '', delta: analytics ? `${Number(analytics.revenue_change_percent) >= 0 ? '+' : ''}${Number(analytics.revenue_change_percent).toFixed(1)}% vs anterior` : '', icon: ShoppingCart },
    { label: 'Pedidos', value: analytics ? String(analytics.order_count) : '', delta: 'Pedidos registrados', icon: BarChart3 },
    { label: 'Ticket médio', value: analytics ? formatMoney(analytics.average_ticket) : '', delta: 'Média por pedido', icon: ChartColumnBig },
    { label: 'Mais vendido', value: analytics?.top_product?.product_name ?? 'Sem dados', delta: analytics?.top_product ? `${analytics.top_product.quantity} unidades` : 'Aguardando pedidos', icon: Users },
  ]
  const maxHourlyOrders = Math.max(...(analytics?.sales_by_hour.map((item) => item.orders) ?? [1]), 1)
  const maxStatusCount = Math.max(...(analytics?.orders_by_status.map((item) => item.count) ?? [1]), 1)
  const maxPaymentCount = Math.max(...(analytics?.orders_by_payment.map((item) => item.count) ?? [1]), 1)
  const maxEssenceCount = Math.max(...(analytics?.essences.map((item) => item.quantity) ?? [1]), 1)

  return (
    <section className="page-content dashboard-tech-shell">
      <div className="page-header dashboard-header"><div><span className="eyebrow black">HOOKAH DRIVE</span><h1>Visão do Lounge</h1><p>Resumo de desempenho</p></div><div className="dashboard-tools"><select value={period} onChange={(event) => setPeriod(event.target.value as AnalyticsPeriod)} aria-label="Período do dashboard"><option value="month">Este mês</option><option value="quarter">Este trimestre</option><option value="all">Todo período</option></select><input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} aria-label="Data inicial" /><input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} aria-label="Data final" /><button type="button" onClick={() => void exportDashboard('xlsx')} disabled={isExporting}>Excel</button><button type="button" onClick={() => void exportDashboard('pdf')} disabled={isExporting}>PDF</button></div></div>
      {error && <div className="api-error"><AlertCircle size={16} />{error}</div>}
      <div className="metrics-grid">{metrics.map(({ label, value, delta, icon: Icon }) => <article key={label} className="metric-tech-card"><div className="metric-card-top"><span>{label}</span><div className="metric-icon"><Icon size={17} /></div></div><strong>{isLoading ? <LoaderCircle className="spin" size={22} /> : value}</strong><small>{delta}</small></article>)}</div>
      <div className="analytics-grid">
        <article className="chart-card"><div className="chart-heading"><div><h3>Vendas por horário</h3><span>Pedidos agrupados pelo horário de criação</span></div><BarChart3 size={17} /></div><div className="bars">{isLoading ? <div className="resource-state"><LoaderCircle className="spin" size={18} />Carregando gráfico...</div> : analytics?.sales_by_hour.length ? analytics.sales_by_hour.map((item) => <div key={item.hour} className="bar-wrap"><span className="bar" style={{ height: `${Math.max(12, (item.orders / maxHourlyOrders) * 100)}%` }} /><small>{item.hour}h</small></div>) : <div className="resource-state">Sem vendas no período.</div>}</div></article>
        <article className="rank-card"><div className="chart-heading"><div><h3>Produtos mais vendidos</h3><span>Quantidade vendida</span></div><ShoppingCart size={17} /></div><ol>{analytics?.products.length ? analytics.products.slice(0, 5).map((item, index) => <li key={item.product_name}><span className="rank-name">{index + 1}. {item.product_name}</span><strong className="rank-total">{item.quantity} un.</strong></li>) : <li><span className="rank-name">Nenhum produto vendido</span></li>}</ol></article>
      </div>
      <div className="analytics-grid dashboard-breakdowns">
        <article className="breakdown-card"><div className="chart-heading"><div><h3>Status dos pedidos</h3><span>Distribuição operacional</span></div><ArrowUpRight size={17} /></div><div className="breakdown-list">{analytics?.orders_by_status.map((item) => <div className="breakdown-row" key={item.label}><div><span>{statusLabels[item.label] ?? item.label}</span><strong>{item.count}</strong></div><i><b style={{ width: `${(item.count / maxStatusCount) * 100}%` }} /></i></div>)}</div></article>
        <article className="breakdown-card"><div className="chart-heading"><div><h3>Meios de pagamento</h3><span>Pedidos por modalidade</span></div><CreditCard size={17} /></div><div className="breakdown-list">{analytics?.orders_by_payment.map((item) => <div className="breakdown-row" key={item.label}><div><span>{paymentLabels[item.label] ?? item.label}</span><strong>{item.count}</strong></div><i><b className="payment-bar" style={{ width: `${(item.count / maxPaymentCount) * 100}%` }} /></i></div>)}</div></article>
        <article className="breakdown-card"><div className="chart-heading"><div><h3>Essências mais vendidas</h3><span>Marca e sabor</span></div><Flame size={17} /></div><div className="breakdown-list">{analytics?.essences.slice(0, 5).map((item) => <div className="breakdown-row" key={`${item.brand_name}-${item.flavor_name}`}><div><span>{item.brand_name} · {item.flavor_name}</span><strong>{item.quantity} un.</strong></div><i><b className="essence-bar" style={{ width: `${(item.quantity / maxEssenceCount) * 100}%` }} /></i></div>)}</div></article>
      </div>
      <div className="insight-banner"><ArrowUpRight size={16} /><div><strong>Dados para decidir melhor.</strong><p>Indicadores calculados no backend para manter o painel leve mesmo com alto volume.</p></div></div>
    </section>
  )
}
