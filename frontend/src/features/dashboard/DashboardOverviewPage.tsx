import { ArrowUpRight, BarChart3, ChartColumnBig, ShoppingCart, Users } from 'lucide-react'

const metrics = [
  { label: 'Faturamento', value: 'R$ 2.840', icon: ShoppingCart },
  { label: 'Pedidos', value: '57', icon: BarChart3 },
  { label: 'Ticket médio', value: 'R$ 49,82', icon: ChartColumnBig },
  { label: 'Mais vendido', value: 'Rosh Banana', icon: Users },
]

const hours = [18, 19, 20, 21, 22, 23]

export function DashboardOverviewPage() {
  return (
    <section className="page-content dashboard-tech-shell">
      <div className="page-header dashboard-header">
        <div>
          <span className="eyebrow black">HOOKAH DRIVE</span>
          <h1>Visão do Lounge</h1>
          <p>Resumo de desempenho</p>
        </div>
      </div>

      <div className="metrics-grid">
        {metrics.map(({ label, value, icon: Icon }) => (
          <article key={label} className="metric-tech-card">
            <span>{label}</span>
            <strong>{value}</strong>
            <Icon size={18} />
          </article>
        ))}
      </div>

      <div className="analytics-grid">
        <article className="chart-card">
          <h3>Vendas por horário</h3>
          <div className="bars">
            {hours.map((hour, index) => (
              <div key={hour} className="bar-wrap">
                <span className="bar" style={{ height: `${42 + (index * 12) % 60}%` }} />
                <small>{hour}h</small>
              </div>
            ))}
          </div>
        </article>

        <article className="rank-card">
          <h3>Produtos mais vendidos</h3>
          <ol>
            <li><span>1. Rosh Banana</span><strong>83 pedidos</strong></li>
            <li><span>2. Rosh Laranja</span><strong>61 pedidos</strong></li>
            <li><span>3. Rosh Morango</span><strong>54 pedidos</strong></li>
          </ol>
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
