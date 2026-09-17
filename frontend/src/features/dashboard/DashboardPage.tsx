import { ArrowDownRight, ArrowUpRight, ChevronRight, Clock3, MoreHorizontal, Plus, ShoppingBag, UsersRound } from 'lucide-react'
import type { OrderSummary } from '../../types'

const orders: OrderSummary[] = [
  { id: '1', orderNumber: '#1048', customer: 'Marina Costa', items: '2 itens', total: 'R$ 86,00', status: 'PREPARING', time: 'há 8 min' },
  { id: '2', orderNumber: '#1047', customer: 'Lucas Ribeiro', items: '4 itens', total: 'R$ 142,50', status: 'READY', time: 'há 14 min' },
  { id: '3', orderNumber: '#1046', customer: 'Camila Dias', items: '1 item', total: 'R$ 34,00', status: 'RECEIVED', time: 'há 21 min' },
  { id: '4', orderNumber: '#1045', customer: 'Rafael Nunes', items: '3 itens', total: 'R$ 110,00', status: 'FINISHED', time: 'há 35 min' },
]

const statusLabels = { AWAITING_PAYMENT: 'Aguardando pagamento', RECEIVED: 'Recebido', PREPARING: 'Preparando', READY: 'Pronto', FINISHED: 'Concluído', CANCELLED: 'Cancelado' }

export function DashboardPage() {
  return (
    <section className="page-content">
      <div className="page-heading dashboard-heading"><div><span className="eyebrow">Segunda-feira, 06 setembro 2026</span><h1>Bom dia, administrador.</h1><p>Acompanhe o ritmo da sua operação hoje.</p></div><button className="primary-button"><Plus size={17} /> Novo pedido</button></div>
      <div className="metric-grid">
        <Metric label="Vendas hoje" value="R$ 2.840,50" note="vs. ontem" trend="+12,8%" positive />
        <Metric label="Pedidos hoje" value="24" note="vs. ontem" trend="+6" positive />
        <Metric label="Ticket médio" value="R$ 118,35" note="últimos 7 dias" trend="+4,2%" positive />
        <Metric label="Clientes ativos" value="186" note="base total" trend="+18" positive />
      </div>

      <div className="dashboard-grid">
        <section className="panel orders-panel"><div className="panel-heading"><div><span className="eyebrow">Operação ao vivo</span><h2>Pedidos recentes</h2></div><button className="text-button">Ver todos <ChevronRight size={16} /></button></div><div className="orders-table"><div className="table-header"><span>Pedido</span><span>Cliente</span><span>Status</span><span>Total</span><span /></div>{orders.map((order) => <OrderRow key={order.id} order={order} />)}</div></section>
        <section className="panel pulse-panel"><div className="panel-heading"><div><span className="eyebrow">Visão rápida</span><h2>Ritmo do dia</h2></div><button className="icon-button"><MoreHorizontal size={19} /></button></div><div className="pulse-value"><strong>68%</strong><span>da meta diária</span></div><div className="progress-track"><span /></div><div className="pulse-meta"><span>R$ 2.840,50 realizados</span><strong>Meta R$ 4.200</strong></div><div className="mini-stats"><div><Clock3 size={17} /><span>Tempo médio</span><strong>18 min</strong></div><div><ShoppingBag size={17} /><span>Em preparo</span><strong>06 pedidos</strong></div></div></section>
      </div>
      <div className="bottom-grid"><section className="insight-card"><div className="insight-icon"><ArrowUpRight size={19} /></div><div><span>Produto destaque</span><strong>Essência Melancia</strong><small>32 unidades vendidas nesta semana</small></div><ChevronRight size={17} /></section><section className="insight-card"><div className="insight-icon warm"><UsersRound size={19} /></div><div><span>Novos clientes</span><strong>18 esta semana</strong><small>12% acima da semana anterior</small></div><ChevronRight size={17} /></section></div>
    </section>
  )
}

function Metric({ label, value, note, trend, positive }: { label: string; value: string; note: string; trend: string; positive?: boolean }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small><i className={positive ? 'trend-up' : 'trend-down'}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{trend}</i> {note}</small></article>
}

function OrderRow({ order }: { order: OrderSummary }) {
  return <div className="table-row"><div className="order-id"><strong>{order.orderNumber}</strong><small>{order.time}</small></div><div className="customer-name"><span>{order.customer.slice(0, 1)}</span><strong>{order.customer}</strong></div><span className={`status status-${order.status.toLowerCase()}`}>{statusLabels[order.status]}</span><strong className="order-total">{order.total}</strong><button className="icon-button"><MoreHorizontal size={17} /></button></div>
}
