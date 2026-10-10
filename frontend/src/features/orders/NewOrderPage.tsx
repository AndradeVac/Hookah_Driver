import { ArrowLeft, Check, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { findRoshProduct, flavorNote, isRoshCategory } from '../../lib/catalog'
import { formatMoney } from '../../lib/format'
import { apiErrorMessage } from '../../services/api'
import { getBrands, type Brand } from '../../services/brands'
import { getCategories, type Category } from '../../services/categories'
import { getCustomers, type Customer } from '../../services/customers'
import { getFlavors, type Flavor } from '../../services/flavors'
import { createOrder } from '../../services/orders'
import { getProducts, type Product } from '../../services/products'
import type { PaymentMethod } from '../../types'

type CartItem = { key: string; product: Product; label: string; quantity: number; notes?: string }

export function NewOrderPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX')
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
    Promise.all([getCustomers(), getProducts(), getCategories(), getBrands(), getFlavors()])
      .then(([loadedCustomers, loadedProducts, loadedCategories, loadedBrands, loadedFlavors]) => {
        const activeCategories = loadedCategories.filter((category) => category.active)
        setCustomers(loadedCustomers.filter((customer) => customer.active))
        setProducts(loadedProducts.filter((product) => product.active))
        setCategories(activeCategories)
        setBrands(loadedBrands.filter((brand) => brand.active))
        setFlavors(loadedFlavors.filter((flavor) => flavor.active))
        setCategoryId(activeCategories[0]?.id ?? '')
      })
      .catch(() => setError('Não foi possível carregar clientes e produtos.'))
      .finally(() => setIsLoading(false))
  }, [])

  const selectedCategory = categories.find((category) => category.id === categoryId)
  const roshSelected = isRoshCategory(selectedCategory)
  const brandFlavors = flavors.filter((flavor) => flavor.brand_id === brandId)
  const selectedFlavor = brandFlavors.find((flavor) => flavor.id === flavorId)
  const rosh = selectedFlavor ? findRoshProduct(products, categories, selectedFlavor) : null
  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0), [cart])

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Math.max(1, Math.floor(Number(quantity)) || 1)
    let item: Omit<CartItem, 'quantity'> | null = null

    if (roshSelected && selectedFlavor && rosh) {
      const brand = brands.find((entry) => entry.id === selectedFlavor.brand_id)
      item = {
        key: `${rosh.product.id}:${selectedFlavor.id}`,
        product: rosh.product,
        label: `${rosh.product.name} · ${brand?.name ?? ''} ${selectedFlavor.name}`.trim(),
        notes: rosh.exact ? undefined : flavorNote(brand, selectedFlavor),
      }
    } else if (!roshSelected) {
      const product = products.find((entry) => entry.id === productId)
      if (product) item = { key: product.id, product, label: product.name }
    }
    if (!item) return

    const newItem = item
    setCart((current) => {
      const existing = current.find((entry) => entry.key === newItem.key)
      return existing
        ? current.map((entry) => entry.key === newItem.key ? { ...entry, quantity: entry.quantity + amount } : entry)
        : [...current, { ...newItem, quantity: amount }]
    })
    setQuantity('1')
  }

  async function submitOrder() {
    if (!customerId || cart.length === 0) return
    setIsSaving(true)
    setError('')
    try {
      const order = await createOrder({
        customer_id: customerId,
        payment_method: paymentMethod,
        items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity, notes: item.notes })),
      })
      navigate(`/orders/${order.id}`)
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível criar o pedido. Confira os dados selecionados.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="auth-loading"><LoaderCircle className="spin" size={20} />Carregando dados...</div>

  const canAdd = roshSelected ? Boolean(rosh) : Boolean(productId)

  return <section className="page-content simple-page new-order-page">
    <button className="back-link" type="button" onClick={() => navigate('/orders')}><ArrowLeft size={16} /> Voltar para pedidos</button>
    <div className="page-heading"><div><span className="eyebrow">Operação conectada</span><h1>Novo pedido</h1><p>Monte o pedido e envie para a operação.</p></div></div>
    {error && <div className="api-error">{error}</div>}
    <div className="new-order-grid">
      <article className="resource-form">
        <label htmlFor="order-customer">Cliente</label>
        <select id="order-customer" className="new-order-select" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
          <option value="">Selecione um cliente</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</option>)}
        </select>
        <label htmlFor="order-category">Adicionar item</label>
        <div className="new-order-picker">
          <select id="order-category" className="new-order-select" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setProductId('') }}>
            {categories.map((category) => <option key={category.id} value={category.id}>{isRoshCategory(category) ? 'Rosh' : category.name}</option>)}
          </select>
          {roshSelected ? <div className="new-order-essence-fields">
            <select className="new-order-select" value={brandId} onChange={(event) => { setBrandId(event.target.value); setFlavorId('') }} aria-label="Marca">
              <option value="">Selecione a marca</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
            <select className="new-order-select" value={flavorId} onChange={(event) => setFlavorId(event.target.value)} disabled={!brandId} aria-label="Sabor">
              <option value="">Selecione o sabor</option>
              {brandFlavors.map((flavor) => <option key={flavor.id} value={flavor.id}>{flavor.name}</option>)}
            </select>
          </div> : <select id="order-product" className="new-order-select" value={productId} onChange={(event) => setProductId(event.target.value)} aria-label="Produto">
            <option value="">Selecione um produto</option>
            {products.filter((product) => product.category_id === categoryId).map((product) => <option key={product.id} value={product.id}>{product.name} · {formatMoney(product.price)}</option>)}
          </select>}
        </div>
        {roshSelected && selectedFlavor && <small className="new-order-hint">{rosh ? `Rosh · ${formatMoney(rosh.product.price)} por unidade` : 'Este sabor ainda não possui um Rosh cadastrado.'}</small>}
        <form className="new-order-item-form" onSubmit={addItem}>
          <label className="new-order-qty"><span>Qtd.</span><input type="number" min="1" max="20" value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-label="Quantidade" /></label>
          <button className="primary-button new-order-add" type="submit" disabled={!canAdd}><Plus size={16} />Adicionar ao pedido</button>
        </form>
        <label htmlFor="order-payment">Pagamento</label>
        <select id="order-payment" className="new-order-select" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
          <option value="PIX">PIX</option>
          <option value="CARD">Cartão</option>
          <option value="CASH">Dinheiro</option>
        </select>
      </article>
      <article className="resource-list order-summary-panel">
        <div className="resource-list-header"><div><strong>Resumo do pedido</strong><span>{cart.length} {cart.length === 1 ? 'item' : 'itens diferentes'}</span></div></div>
        {cart.length === 0 ? <div className="resource-state">Adicione produtos ao pedido.</div> : <>
          {cart.map((item) => <div className="resource-row" key={item.key}>
            <div><strong>{item.quantity}x {item.label}</strong><span>{formatMoney(item.product.price)} cada</span></div>
            <div className="order-summary-actions"><b>{formatMoney(Number(item.product.price) * item.quantity)}</b><button className="icon-danger" type="button" onClick={() => setCart((current) => current.filter((entry) => entry.key !== item.key))} aria-label={`Remover ${item.label}`}><Trash2 size={15} /></button></div>
          </div>)}
          <div className="new-order-total"><span>Total</span><strong>{formatMoney(total)}</strong></div>
          {!customerId && <p className="new-order-warning">Selecione um cliente para criar o pedido.</p>}
          <button className="primary-button detail-action" type="button" disabled={isSaving || !customerId || cart.length === 0} onClick={() => void submitOrder()}>{isSaving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{isSaving ? 'Enviando...' : 'Criar pedido'}</button>
        </>}
      </article>
    </div>
  </section>
}
