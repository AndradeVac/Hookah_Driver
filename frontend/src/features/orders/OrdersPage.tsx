import { ShoppingBag } from 'lucide-react'

const newOrders = [
  { id: '123', customer: 'João Vítor', place: 'Pedido no Lounge', flavor: 'Rosh', product: 'ZIGGY · Banana', price: 'R$ 60,00', accent: 'new' },
  { id: '124', customer: 'Vitor', place: 'Pedido no Lounge', flavor: 'Rosh', product: 'ZOMO · Laranja', price: 'R$ 50,00', accent: 'new' },
]

const preparingOrders = [
  { id: '122', customer: 'Maria', place: 'Pedido no Lounge', flavor: 'Rosh', product: 'NAY · Morango', price: 'R$ 55,00', accent: 'prep' },
  { id: '120', customer: 'Pedro', place: 'Pedido no Lounge', flavor: 'Rosh', product: 'ZIGGY · Menta', price: 'R$ 50,00', accent: 'prep' },
]

const readyOrders = [
  { id: '119', customer: 'Carlos', place: 'Pedido no Lounge', flavor: 'Rosh', product: 'ZIGGY · Banana', price: 'R$ 50,00', accent: 'ready' },
]

const columns = [
  { key: 'new', title: 'NOVOS', items: newOrders },
  { key: 'prep', title: 'EM PREPARO', items: preparingOrders },
  { key: 'ready', title: 'PRONTOS', items: readyOrders },
] as const

export function OrdersPage() {
  return (
    <section className="page-content orders-page-shell">
      <div className="page-header orders-header">
        <div>
          <h1>Pedidos</h1>
          <p>Operação em tempo real</p>
        </div>
        <div className="pill-status">Hoje · 57 pedidos</div>
      </div>

      <div className="orders-columns">
        {columns.map((column) => (
          <div key={column.key} className="orders-column">
            <h3>{column.title}</h3>
            <div className="orders-list">
              {column.items.map((order) => (
                <article key={order.id} className={`order-card order-card-${order.accent}`}>
                  <div className="order-topline">
                    <span className="order-number">#{order.id}</span>
                    <span className="order-user">{order.customer}</span>
                    <span className="order-place">{order.place}</span>
                  </div>

                  <div className="order-product">
                    <span className="product-tag">{order.flavor}</span>
                    <span className="product-name">{order.product}</span>
                  </div>

                  <div className="order-price">R$ {order.price.replace('R$ ', '')}</div>

                  <button className={`order-action order-action-${order.accent}`}>
                    {order.accent === 'new' ? 'Aceitar pedido' : order.accent === 'prep' ? 'Marcar como pronto' : 'Entregar'}
                  </button>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
