import { ArrowLeft, Check, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBrands, type Brand } from '../../services/brands'
import { getCategories, type Category } from '../../services/categories'
import { getCustomers, type Customer } from '../../services/customers'
import { createOrder } from '../../services/orders'
import { getFlavors, type Flavor } from '../../services/flavors'
import { getProducts, type Product } from '../../services/products'

type CartItem = { product: Product; quantity: number }

function money(value: string) {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`
}

export function NewOrderPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CARD' | 'CASH'>('PIX')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [flavorId, setFlavorId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getCustomers(), getProducts(), getCategories(), getBrands(), getFlavors()]).then(([loadedCustomers, loadedProducts, loadedCategories, loadedBrands, loadedFlavors]) => {
      const activeCustomers = loadedCustomers.filter((customer) => customer.active)
      const activeProducts = loadedProducts.filter((product) => product.active)
      setCustomers(activeCustomers)
      setProducts(activeProducts)
      const activeCategories = loadedCategories.filter((category) => category.active)
      const activeBrands = loadedBrands.filter((brand) => brand.active)
      const activeFlavors = loadedFlavors.filter((flavor) => flavor.active)
      setCategories(activeCategories)
      setBrands(activeBrands)
      setFlavors(activeFlavors)
      setCustomerId(activeCustomers[0]?.id ?? '')
      setProductId(activeProducts[0]?.id ?? '')
      setCategoryId(activeCategories[0]?.id ?? '')
      setBrandId(activeBrands[0]?.id ?? '')
      setFlavorId(activeFlavors.find((flavor) => flavor.brand_id === activeBrands[0]?.id)?.id ?? '')
    }).catch(() => setError('Não foi possível carregar clientes e produtos.')).finally(() => setIsLoading(false))
  }, [])

  function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const selectedProductId = isRoshCategory ? selectedBrandProduct?.id : productId
    const product = products.find((item) => item.id === selectedProductId)
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
  const selectedCategory = categories.find((category) => category.id === categoryId)
  const isRoshCategory = selectedCategory?.name.toLowerCase() === 'essências' || selectedCategory?.name.toLowerCase() === 'rosh'
  const brandFlavors = flavors.filter((flavor) => flavor.brand_id === brandId)
  const selectedBrandProduct = products.find((product) => product.category_id === categoryId && brandFlavors.some((flavor) => flavor.id === product.flavor_id))
  const displayCategoryName = (category: Category) => category.name.toLowerCase() === 'essências' ? 'Rosh' : category.name

  if (isLoading) return <div className="auth-loading"><LoaderCircle className="spin" size={20} />Carregando dados...</div>

  return <section className="page-content simple-page new-order-page">
    <button className="back-link" type="button" onClick={() => navigate('/orders')}><ArrowLeft size={16} /> Voltar para pedidos</button>
    <div className="page-heading"><div><span className="eyebrow">Operação conectada</span><h1>Novo pedido</h1><p>Monte o pedido e envie para a operação.</p></div></div>
    {error && <div className="api-error">{error}</div>}
    <div className="new-order-grid">
      <article className="resource-form">
        <label htmlFor="order-customer">Cliente</label>
        <select id="order-customer" className="new-order-select" value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Selecione um cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} {customer.phone ? `· ${customer.phone}` : ''}</option>)}</select>
        <label htmlFor="order-category">Adicionar item</label>
        <select id="order-category" className="new-order-select" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setProductId('') }}>{categories.map((category) => <option key={category.id} value={category.id}>{displayCategoryName(category)}</option>)}</select>
        {isRoshCategory ? <div className="new-order-essence-fields"><select className="new-order-select" value={brandId} onChange={(event) => { setBrandId(event.target.value); setFlavorId(brandFlavors.find((flavor) => flavor.brand_id === event.target.value)?.id ?? '') }}><option value="">Selecione a marca</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select><select className="new-order-select" value={flavorId} onChange={(event) => setFlavorId(event.target.value)} disabled={!brandId}><option value="">Selecione o sabor</option>{brandFlavors.map((flavor) => <option key={flavor.id} value={flavor.id}>{flavor.name}</option>)}</select></div> : <select id="order-product" className="new-order-select" value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Selecione um produto</option>{products.filter((product) => product.category_id === categoryId).map((product) => <option key={product.id} value={product.id}>{product.name} · {money(product.price)}</option>)}</select>}
        {isRoshCategory && <small className="new-order-hint">{selectedBrandProduct ? `Rosh · ${money(selectedBrandProduct.price)} por unidade` : 'Esta marca ainda não possui um Rosh cadastrado.'}</small>}
        <form className="new-order-item-form" onSubmit={addProduct}><input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-label="Quantidade" /><button className="icon-success" type="submit" aria-label="Adicionar item" disabled={isRoshCategory ? !selectedBrandProduct || !flavorId : !productId}><Plus size={17} /></button></form>
        <label htmlFor="order-payment">Pagamento</label>
        <select id="order-payment" className="new-order-select" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}><option value="PIX">PIX</option><option value="CARD">Cartão</option><option value="CASH">Dinheiro</option></select>
      </article>
      <article className="resource-list order-summary-panel"><div className="resource-list-header"><div><strong>Resumo do pedido</strong><span>{cart.length} itens diferentes</span></div></div>{cart.length === 0 ? <div className="resource-state">Adicione produtos ao pedido.</div> : <>{cart.map((item) => <div className="resource-row" key={item.product.id}><div><strong>{item.quantity}x {item.product.name}</strong><span>{money(item.product.price)} cada</span></div><div className="order-summary-actions"><b>{money((Number(item.product.price) * item.quantity).toFixed(2))}</b><button className="icon-danger" type="button" onClick={() => setCart((current) => current.filter((entry) => entry.product.id !== item.product.id))} aria-label={`Remover ${item.product.name}`}><Trash2 size={15} /></button></div></div>)}<div className="new-order-total"><span>Total</span><strong>{money(total.toFixed(2))}</strong></div><button className="primary-button detail-action" type="button" disabled={isSaving || !customerId || cart.length === 0} onClick={() => void submitOrder()}>{isSaving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{isSaving ? 'Enviando...' : 'Criar pedido'}</button></>}</article>
    </div>
  </section>
}