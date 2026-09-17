import { AlertCircle, CheckCircle2, Clock, Loader, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getOrders, updateOrderStatus, type Order } from '../../services/lounge'
import { getWebSocketUrl } from '../../services/api'

export function OrdersTrackingPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const money = (v: string | number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`

  useEffect(() => {
    getOrders().then(setOrders).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const socket = new WebSocket(getWebSocketUrl('/admin/ws/orders'))
    socket.onmessage = (e) => {
      const update = JSON.parse(e.data) as Order
      setOrders((curr) => curr.map((o) => o.id === update.id ? update : o).sort((a, b) => b.order_number - a.order_number))
    }
    return () => socket.close()
  }, [])

  const groupedOrders = {
    AWAITING_PAYMENT: orders.filter((o) => o.status === 'AWAITING_PAYMENT'),
    RECEIVED: orders.filter((o) => o.status === 'RECEIVED'),
    PREPARING: orders.filter((o) => o.status === 'PREPARING'),
    READY: orders.filter((o) => o.status === 'READY'),
    FINISHED: orders.filter((o) => o.status === 'FINISHED'),
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando pedidos...</div>

  return (
    <main style={{ background: '#0f1419', color: '#fff', minHeight: '100vh', padding: '24px' }}>
      <h1 style={{ marginBottom: '32px' }}>Acompanhamento de Pedidos</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* AWAITING PAYMENT */}
        <section style={{ background: '#1a1f2e', padding: '16px', borderRadius: '8px', border: '1px solid #e74c3c' }}>
          <h2 style={{ fontSize: '16px', marginBottom: '16px', color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} /> Aguardando Pagamento ({groupedOrders.AWAITING_PAYMENT.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {groupedOrders.AWAITING_PAYMENT.map((o) => (
              <div key={o.id} style={{ background: '#252d3d', padding: '12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Pedido #{o.order_number}</div>
                <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>{o.customer_name} · {money(o.total)}</div>
              </div>
            ))}
            {groupedOrders.AWAITING_PAYMENT.length === 0 && <div style={{ color: '#666' }}>Nenhum pedido</div>}
          </div>
        </section>

        {/* RECEIVED */}
        <section style={{ background: '#1a1f2e', padding: '16px', borderRadius: '8px', border: '1px solid #3498db' }}>
          <h2 style={{ fontSize: '16px', marginBottom: '16px', color: '#3498db', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} /> Recebidos ({groupedOrders.RECEIVED.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {groupedOrders.RECEIVED.map((o) => (
              <div key={o.id} style={{ background: '#252d3d', padding: '12px', borderRadius: '6px', cursor: 'pointer' }} onClick={() => updateOrderStatus(o.id, 'PREPARING').then(() => {})}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Pedido #{o.order_number}</div>
                <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>{o.customer_name}</div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Clique para iniciar preparo</div>
              </div>
            ))}
            {groupedOrders.RECEIVED.length === 0 && <div style={{ color: '#666' }}>Nenhum pedido</div>}
          </div>
        </section>

        {/* PREPARING */}
        <section style={{ background: '#1a1f2e', padding: '16px', borderRadius: '8px', border: '1px solid #f39c12' }}>
          <h2 style={{ fontSize: '16px', marginBottom: '16px', color: '#f39c12', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader size={20} /> Em Preparo ({groupedOrders.PREPARING.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {groupedOrders.PREPARING.map((o) => (
              <div key={o.id} style={{ background: '#252d3d', padding: '12px', borderRadius: '6px', cursor: 'pointer' }} onClick={() => updateOrderStatus(o.id, 'READY').then(() => {})}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Pedido #{o.order_number}</div>
                <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>{o.customer_name}</div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Clique para marcar como pronto</div>
              </div>
            ))}
            {groupedOrders.PREPARING.length === 0 && <div style={{ color: '#666' }}>Nenhum pedido</div>}
          </div>
        </section>

        {/* READY */}
        <section style={{ background: '#1a1f2e', padding: '16px', borderRadius: '8px', border: '1px solid #27ae60' }}>
          <h2 style={{ fontSize: '16px', marginBottom: '16px', color: '#27ae60', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={20} /> Prontos ({groupedOrders.READY.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {groupedOrders.READY.map((o) => (
              <div key={o.id} style={{ background: '#252d3d', padding: '12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Pedido #{o.order_number}</div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>{o.customer_name}</div>
                </div>
                <button onClick={() => updateOrderStatus(o.id, 'FINISHED').then(() => {})} style={{ background: '#27ae60', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Entregue</button>
              </div>
            ))}
            {groupedOrders.READY.length === 0 && <div style={{ color: '#666' }}>Nenhum pedido</div>}
          </div>
        </section>

        {/* FINISHED */}
        <section style={{ background: '#1a1f2e', padding: '16px', borderRadius: '8px', border: '1px solid #666' }}>
          <h2 style={{ fontSize: '16px', marginBottom: '16px', color: '#888', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={20} /> Entregues ({groupedOrders.FINISHED.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
            {groupedOrders.FINISHED.map((o) => (
              <div key={o.id} style={{ background: '#252d3d', padding: '12px', borderRadius: '6px', opacity: 0.6 }}>
                <div style={{ fontSize: '12px' }}>Pedido #{o.order_number}</div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{o.customer_name}</div>
              </div>
            ))}
            {groupedOrders.FINISHED.length === 0 && <div style={{ color: '#666' }}>Nenhum pedido</div>}
          </div>
        </section>
      </div>
    </main>
  )
}
