import { ArrowRight, Check, ChevronLeft, LoaderCircle, Minus, Plus, QrCode, ShoppingBag } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getBrands, type Brand } from '../../services/brands'
import { getCategories, type Category } from '../../services/categories'
import { getFlavors, type Flavor } from '../../services/flavors'
import { getProducts, type Product } from '../../services/products'
import { createPublicOrder, type PublicOrderResponse } from '../../services/publicOrders'

type CartItem = { product: Product; quantity: number; variation?: string }

type Step = 'menu' | 'cart' | 'customer' | 'payment' | 'success'

function money(value: string | number) { return `R$ ${Number(value).toFixed(2).replace('.', ',')}` }

export function CustomerOrderPage() {
  const [params] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [step, setStep] = useState<Step>('menu')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedFlavor, setSelectedFlavor] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [payment, setPayment] = useState<'PIX' | 'CARD'>('PIX')
  const [order, setOrder] = useState<PublicOrderResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getProducts(), getCategories(), getBrands(), getFlavors()]).then(([loadedProducts, loadedCategories, loadedBrands, loadedFlavors]) => {
      setProducts(loadedProducts.filter((product) => product.active))
      const activeCategories = loadedCategories.filter((category) => category.active)
      setCategories(activeCategories)
      setBrands(loadedBrands.filter((brand) => brand.active))
      setFlavors(loadedFlavors.filter((flavor) => flavor.active))
      setSelectedCategory(activeCategories[0]?.id ?? '')
    }).catch(() => setError('Não foi possível carregar o cardápio.')).finally(() => setLoading(false))
  }, [])

  const currentCategory = categories.find((category) => category.id === selectedCategory)
  const isRosh = currentCategory?.name.toLowerCase() === 'rosh' || currentCategory?.name.toLowerCase() === 'essências'
  const currentFlavors = flavors.filter((flavor) => flavor.brand_id === selectedBrand)
  const roshProduct = products.find((product) => product.category_id === selectedCategory && currentFlavors.some((flavor) => flavor.id === product.flavor_id))
  const visibleProducts = products.filter((product) => product.category_id === selectedCategory && (!isRosh || product.flavor_id === null))
  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0), [cart])
  const table = params.get('mesa') ?? 'Lounge'
  const lounge = params.get('lounge') ?? 'Lounge Hookah'

  function addProduct(product: Product, variation?: string) {
    setCart((current) => { const existing = current.find((item) => item.product.id === product.id && item.variation === variation); return existing ? current.map((item) => item === existing ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { product, quantity: 1, variation }] })
  }

  function changeQuantity(item: CartItem, delta: number) {
    setCart((current) => current.map((entry) => entry === item ? { ...entry, quantity: Math.max(0, entry.quantity + delta) } : entry).filter((entry) => entry.quantity > 0))
  }

  async function finishPayment() {
    if (!name.trim() || !phone.trim() || cart.length === 0) return
    setSending(true); setError('')
    try { setOrder(await createPublicOrder({ customer_name: name.trim(), customer_phone: phone.trim(), payment_method: payment, items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })) })); setStep('success') } catch { setError('Não foi possível confirmar o pedido.') } finally { setSending(false) }
  }

  if (loading) return <div className="customer-loading"><LoaderCircle className="spin" size={22} />Abrindo seu cardápio...</div>

  return <main className="customer-app"><header className="customer-header"><div><span className="customer-kicker">{lounge}</span><h1>Cardápio digital</h1><p>{table === 'Lounge' ? 'Escolha seus produtos' : `Mesa ${table}`}</p></div><div className="customer-qr"><QrCode size={20} /><span>Pedido online</span></div></header>{error && <div className="customer-error">{error}</div>}{step === 'menu' && <><div className="customer-categories">{categories.map((category) => <button className={selectedCategory === category.id ? 'active' : ''} key={category.id} type="button" onClick={() => { setSelectedCategory(category.id); setSelectedBrand(''); setSelectedFlavor('') }}>{category.name === 'Essências' ? 'Rosh' : category.name}</button>)}</div>{isRosh && <div className="customer-rosh-selects"><select value={selectedBrand} onChange={(event) => { setSelectedBrand(event.target.value); setSelectedFlavor('') }}><option value="">Escolha a marca</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select><select value={selectedFlavor} onChange={(event) => setSelectedFlavor(event.target.value)} disabled={!selectedBrand}><option value="">Escolha o sabor</option>{currentFlavors.map((flavor) => <option key={flavor.id} value={flavor.id}>{flavor.name}</option>)}</select></div>}<section className="customer-products">{isRosh ? (roshProduct && selectedFlavor ? <article className="customer-product-card"><div><span className="customer-product-tag">Rosh · {brands.find((brand) => brand.id === selectedBrand)?.name}</span><h2>Rosh</h2><p>{currentFlavors.find((flavor) => flavor.id === selectedFlavor)?.name}</p></div><div><strong>{money(roshProduct.price)}</strong><button type="button" onClick={() => addProduct(roshProduct, selectedFlavor)}><Plus size={16} /> Adicionar</button></div></article> : <div className="customer-empty">Escolha uma marca e um sabor para ver o Rosh.</div>) : visibleProducts.map((product) => <article className="customer-product-card" key={product.id}><div><h2>{product.name}</h2><p>{product.description || 'Preparado para você'}</p></div><div><strong>{money(product.price)}</strong><button type="button" onClick={() => addProduct(product)}><Plus size={16} /> Adicionar</button></div></article>)}</section></>}{step === 'cart' && <CustomerCart cart={cart} total={total} changeQuantity={changeQuantity} onBack={() => setStep('menu')} onContinue={() => setStep('customer')} />}{step === 'customer' && <section className="customer-panel"><button className="customer-back" type="button" onClick={() => setStep('cart')}><ChevronLeft size={16} /> Carrinho</button><h2>Quem fará o pedido?</h2><input placeholder="Seu nome" value={name} onChange={(event) => setName(event.target.value)} /><input placeholder="WhatsApp / telefone" value={phone} onChange={(event) => setPhone(event.target.value)} /><button className="customer-primary" type="button" disabled={!name.trim() || !phone.trim()} onClick={() => setStep('payment')}>Continuar <ArrowRight size={16} /></button></section>}{step === 'payment' && <section className="customer-panel"><button className="customer-back" type="button" onClick={() => setStep('customer')}><ChevronLeft size={16} /> Dados</button><h2>Pagamento digital</h2><p className="customer-muted">Ambiente de demonstração. A integração do gateway será conectada nesta etapa.</p><div className="payment-choice"><button className={payment === 'PIX' ? 'active' : ''} onClick={() => setPayment('PIX')} type="button">PIX</button><button className={payment === 'CARD' ? 'active' : ''} onClick={() => setPayment('CARD')} type="button">Cartão</button></div><div className="customer-total">Total <strong>{money(total)}</strong></div><button className="customer-primary" type="button" disabled={sending} onClick={() => void finishPayment()}>{sending ? 'Processando...' : 'Simular pagamento aprovado'} <Check size={16} /></button></section>}{step === 'success' && order && <section className="customer-success"><div className="success-mark"><Check size={30} /></div><span>Pagamento aprovado</span><h2>Pedido #{order.order_number} confirmado</h2><p>Seu pedido foi enviado para a operação.</p><strong>{money(order.total)}</strong><div className="customer-status-track"><span className="active">Pedido recebido</span><span>Em preparo</span><span>Pronto</span><span>Entregue</span></div></section>}<button className="customer-cart-button" type="button" onClick={() => setStep('cart')}><ShoppingBag size={18} /><span>{cart.reduce((sum, item) => sum + item.quantity, 0)} itens</span><strong>{money(total)}</strong></button></main>
}

function CustomerCart({ cart, total, changeQuantity, onBack, onContinue }: { cart: CartItem[]; total: number; changeQuantity: (item: CartItem, delta: number) => void; onBack: () => void; onContinue: () => void }) {
  return <section className="customer-panel"><button className="customer-back" type="button" onClick={onBack}><ChevronLeft size={16} /> Menu</button><h2>Seu carrinho</h2>{cart.length === 0 ? <div className="customer-empty">Seu carrinho está vazio.</div> : cart.map((item) => <div className="customer-cart-row" key={`${item.product.id}-${item.variation}`}><div><strong>{item.product.name}</strong><span>{item.variation ? `Sabor: ${item.variation}` : ''}</span></div><div><button onClick={() => changeQuantity(item, -1)} type="button"><Minus size={14} /></button><b>{item.quantity}</b><button onClick={() => changeQuantity(item, 1)} type="button"><Plus size={14} /></button></div></div>)}<div className="customer-total">Total <strong>{money(total)}</strong></div><button className="customer-primary" type="button" disabled={!cart.length} onClick={onContinue}>Confirmar pedido <ArrowRight size={16} /></button></section>
}
