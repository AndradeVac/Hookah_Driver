import { ArrowLeft, Check, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomers, type Customer } from '../../services/customers'
import { createOrder } from '../../services/orders'
import { getProducts, type Product } from '../../services/products'

type CartItem = { product: Product; quantity: number }

function money(value: string) {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`
}

export function NewOrderPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CARD' | 'CASH'>('PIX')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getCustomers(), getProducts()]).then(([loadedCustomers, loadedProducts]) => {
      const activeCustomers = loadedCustomers.filter((customer) => customer.active)
      const activeProducts = loadedProducts.filter((product) => product.active)
      setCustomers(activeCustomers)
      setProducts(activeProducts)
      setCustomerId(activeCustomers[0]?.id ?? '')
      setProductId(activeProducts[0]?.id ?? '')
    }).catch(() => setError('Não foi possível carregar clientes e produtos.')).finally(() => setIsLoading(false))
  }, [])

  function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const product = products.find((item) => item.id === productId)
    const amount = Math.max(1, Number(quantity) || 1)
    if (!product) return
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id)
      return existing ? current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + amount } : item) : [...current, { product, quantity: amount }]
    })
    setQuantity('1')
  }

  async function submitOrder() {
    if (!customerId || cart.length === 0) return
    setIsSaving(true)
    setError('')
    try {
      const order = await createOrder({ customer_id: customerId, payment_method: paymentMethod, items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })) })
      navigate(`/orders/${order.id}`)
    } catch {
      setError('Não foi possível criar o pedido. Confira os dados selecionados.')
    } finally {
      setIsSaving(false)
    }
  }

  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0), [cart])

  if (isLoading) return <div className="auth-loading"><LoaderCircle className="spin" size={20} />Carregando dados...</div>

  return <section className="page-content simple-page new-order-page">
    <button className="back-link" type="button" onClick={() => navigate('/orders')}><ArrowLeft size={16} /> Voltar para pedidos</button>
    <div className="page-heading"><div><span className="eyebrow">Operação conectada</span><h1>Novo pedido</h1><p>Monte o pedido e envie para a operação.</p></div></div>
    {error && <div className="api-error">{error}</div>}
    <div className="new-order-grid">
      <article className="resource-form">
        <label htmlFor="order-customer">Cliente</label>
        <select id="order-customer" className="new-order-select" value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Selecione um cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} {customer.phone ? `· ${customer.phone}` : ''}</option>)}</select>
        <label htmlFor="order-product">Adicionar item</label>
        <form className="new-order-item-form" onSubmit={addProduct}><select id="order-product" className="new-order-select" value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Selecione um produto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {money(product.price)}</option>)}</select><input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-label="Quantidade" /><button className="icon-success" type="submit" aria-label="Adicionar item"><Plus size={17} /></button></form>
        <label htmlFor="order-payment">Pagamento</label>
        <select id="order-payment" className="new-order-select" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}><option value="PIX">PIX</option><option value="CARD">Cartão</option><option value="CASH">Dinheiro</option></select>
      </article>
      <article className="resource-list order-summary-panel"><div className="resource-list-header"><div><strong>Resumo do pedido</strong><span>{cart.length} itens diferentes</span></div></div>{cart.length === 0 ? <div className="resource-state">Adicione produtos ao pedido.</div> : <>{cart.map((item) => <div className="resource-row" key={item.product.id}><div><strong>{item.quantity}x {item.product.name}</strong><span>{money(item.product.price)} cada</span></div><div className="order-summary-actions"><b>{money((Number(item.product.price) * item.quantity).toFixed(2))}</b><button className="icon-danger" type="button" onClick={() => setCart((current) => current.filter((entry) => entry.product.id !== item.product.id))} aria-label={`Remover ${item.product.name}`}><Trash2 size={15} /></button></div></div>)}<div className="new-order-total"><span>Total</span><strong>{money(total.toFixed(2))}</strong></div><button className="primary-button detail-action" type="button" disabled={isSaving || !customerId || cart.length === 0} onClick={() => void submitOrder()}>{isSaving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{isSaving ? 'Enviando...' : 'Criar pedido'}</button></>}</article>
    </div>
  </section>
}