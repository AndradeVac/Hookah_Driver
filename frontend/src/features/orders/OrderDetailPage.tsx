const timeline = [
  { label: 'Pedido recebido', time: '17:42', active: true },
  { label: 'Aceito', time: '17:43', active: true },
  { label: 'Em preparo', time: '17:45', active: true },
  { label: 'Pronto', time: '—', active: false },
  { label: 'Entregue', time: '—', active: false },
]

export function OrderDetailPage() {
  return (
    <section className="page-content order-detail-shell">
      <div className="page-header order-detail-header">
        <div>
          <span className="eyebrow black">HOOKAH DRIVE</span>
          <div className="header-inline">
            <h1>Pedido #123</h1>
            <span className="badge badge-warning">Anonymous</span>
          </div>
          <p>Detalhes completos do pedido</p>
        </div>
      </div>

      <div className="detail-grid">
        <article className="detail-panel detail-panel-main">
          <div className="customer-name-row">João Vítor</div>

          <div className="chip">Pedido no Lounge</div>

          <div className="product-card">
            <h2>Rosh Banana</h2>
            <p>Marca: ZIGGY</p>
            <p>Essência: Banana</p>
            <p>Adicional: Extra sabor</p>
          </div>

          <div className="order-total-box">
            <span>Valor do pedido</span>
            <strong>R$ 60,00</strong>
          </div>

          <button className="primary-button">EM PREPARO</button>
          <button className="danger-button">Marcar como pronto</button>
        </article>

        <aside className="detail-panel detail-panel-side">
          <h3>Linha do tempo</h3>
          <ul className="timeline">
            {timeline.map((item) => (
              <li key={item.label} className={item.active ? 'active' : ''}>
                <span className="dot" />
                <span className="timeline-label">{item.label}</span>
                <span className="timeline-time">{item.time}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <div className="detail-footer">Receber → preparar → entregar.</div>
    </section>
  )
}
