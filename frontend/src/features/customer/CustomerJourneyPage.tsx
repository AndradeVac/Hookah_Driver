import { ArrowLeft, ArrowRight, Check, ChevronRight, LoaderCircle, Minus, Plus, QrCode, ShoppingBag } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getBrands, type Brand } from '../../services/brands'
import { getCategories, type Category } from '../../services/categories'
import { getFlavors, type Flavor } from '../../services/flavors'
import { getProducts, type Product } from '../../services/products'
import { createPublicOrder, type PublicOrderResponse } from '../../services/publicOrders'
import { useSearchParams } from 'react-router-dom'

type Step = 'register' | 'menu' | 'category' | 'brands' | 'flavors' | 'rosh' | 'cart' | 'customer' | 'payment' | 'success'
type CartItem = { product: Product; quantity: number; variation?: string }
const money = (value: string | number) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`

export function CustomerJourneyPage() {
  const [step, setStep] = useState<Step>('register')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [brands, setBrands] = useState<Brand[]>([])
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [flavor, setFlavor] = useState<Flavor | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [payment, setPayment] = useState<'PIX' | 'CARD'>('PIX')
  const [order, setOrder] = useState<PublicOrderResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getBrands(), getFlavors(), getCategories(), getProducts()]).then(([loadedBrands, loadedFlavors, loadedCategories, loadedProducts]) => {
      setBrands(loadedBrands.filter((item) => item.active))
      setFlavors(loadedFlavors.filter((item) => item.active))
      setCategories(loadedCategories.filter((item) => item.active))
      setProducts(loadedProducts.filter((item) => item.active))
    }).catch(() => setError('Não foi possível carregar o cardápio.')).finally(() => setLoading(false))
  }, [])

  const roshCategory = categories.find((item) => ['rosh', 'essências'].includes(item.name.toLowerCase()))
  const brandFlavors = flavors.filter((item) => item.brand_id === brand?.id)
  const rosh = products.find((item) => item.category_id === roshCategory?.id && item.flavor_id && brandFlavors.some((itemFlavor) => itemFlavor.id === item.flavor_id))
  const extras = categories.filter((item) => !['rosh', 'essências'].includes(item.name.toLowerCase())).flatMap((category) => products.filter((product) => product.category_id === category.id)).slice(0, 8)
  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0), [cart])
  const categoryProducts = selectedCategory ? products.filter((product) => product.category_id === selectedCategory.id) : []
  const add = (product: Product, variation?: string) => setCart((current) => { const found = current.find((item) => item.product.id === product.id && item.variation === variation); return found ? current.map((item) => item === found ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { product, quantity: 1, variation }] })
  const change = (item: CartItem, delta: number) => setCart((current) => current.map((entry) => entry === item ? { ...entry, quantity: Math.max(0, entry.quantity + delta) } : entry).filter((entry) => entry.quantity > 0))
  const back = () => setStep(step === 'category' ? 'menu' : step === 'brands' ? 'menu' : step === 'flavors' ? 'brands' : step === 'rosh' ? 'flavors' : step === 'cart' ? 'menu' : 'menu')
  async function submit() { if (!name || !phone || !cart.length) return; setSending(true); try { setOrder(await createPublicOrder({ customer_name: name, customer_phone: phone, payment_method: payment, items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })) })); setStep('success') } catch { setError('Não foi possível confirmar o pedido.') } finally { setSending(false) } }

  if (loading) return <div className="customer-loading"><LoaderCircle className="spin" size={22} />Abrindo seu cardápio...</div>
  const headerTitle = { register: 'Antes de começar', menu: 'Cardápio', category: selectedCategory?.name ?? 'Produtos', brands: 'Marcas', flavors: 'Sabores', rosh: 'Seu Rosh', cart: 'Seu pedido', customer: 'Confirmar pedido', payment: 'Pagamento', success: 'Pedido confirmado' }[step]
  const header = <header className="customer-header"><div><span className="customer-kicker">HOOKAH DRIVER</span><h1>{headerTitle}</h1><p>{step === 'register' ? 'Identifique seu pedido em poucos segundos.' : 'Escolha com calma. O lounge cuida do resto.'}</p></div><div className="customer-qr"><QrCode size={20} /><span>QR do lounge</span></div></header>

  return <main className="customer-app">{header}{error && <div className="customer-error">{error}</div>}
    {step === 'register' && <section className="customer-panel customer-register"><h2>Como podemos te chamar?</h2><label>Nome<input placeholder="João Vitor" value={name} onChange={(event) => setName(event.target.value)} /></label><label>WhatsApp<input placeholder="(11) 99999-9999" value={phone} onChange={(event) => setPhone(event.target.value)} /></label><small>Usaremos esses dados apenas para identificar e acompanhar seu pedido.</small><button className="customer-primary" disabled={!name.trim() || !phone.trim()} onClick={() => setStep('menu')}>Continuar <ArrowRight size={16} /></button></section>}
    {step === 'menu' && <section className="journey-menu"><div className="journey-feature"><span>Mais pedidos</span><h2>Rosh</h2><p>Escolha uma marca e descubra os sabores.</p><button onClick={() => setStep('brands')}>Escolher Rosh <ArrowRight size={16} /></button></div><h3>Categorias</h3><div className="journey-categories">{categories.filter((item) => !['rosh', 'essências'].includes(item.name.toLowerCase())).map((category) => <button key={category.id} onClick={() => { setSelectedCategory(category); setStep('category') }}><span>{category.name}</span><ChevronRight size={16} /></button>)}</div></section>}
    {step === 'category' && <section className="journey-panel"><button className="customer-back" onClick={back}><ArrowLeft size={16} /> Categorias</button><div className="journey-options">{categoryProducts.map((product) => <button key={product.id} onClick={() => { add(product); setStep('cart') }}><span><strong>{product.name}</strong><small>{product.description || 'Preparado para você'}</small></span><strong>{money(product.price)}</strong><Plus size={17} /></button>)}</div></section>}
    {(step === 'brands' || step === 'flavors' || step === 'rosh') && <section className="journey-panel"><button className="customer-back" onClick={back}><ArrowLeft size={16} /> Voltar</button>{step === 'brands' && <div className="journey-options">{brands.map((item) => <button key={item.id} onClick={() => { setBrand(item); setStep('flavors') }}><strong>{item.name}</strong><span>{flavors.filter((itemFlavor) => itemFlavor.brand_id === item.id).length} sabores disponíveis</span><ChevronRight size={17} /></button>)}</div>}{step === 'flavors' && <div className="journey-options">{brandFlavors.map((item) => <button key={item.id} onClick={() => { setFlavor(item); setStep('rosh') }}><strong>{item.name}</strong><span>{brand?.name}</span><ChevronRight size={17} /></button>)}</div>}{step === 'rosh' && rosh && flavor && <article className="journey-rosh-card"><span>{brand?.name}</span><h2>Rosh</h2><p>Sabor {flavor.name}</p><strong>{money(rosh.price)}</strong><button onClick={() => { add(rosh, flavor.name); setStep('cart') }}>Adicionar ao pedido <Plus size={16} /></button></article>}</section>}
    {step === 'cart' && <section className="customer-panel"><button className="customer-back" onClick={() => setStep('menu')}><ArrowLeft size={16} /> Menu</button><h2>Resumo do pedido</h2>{cart.length ? cart.map((item) => <div className="customer-cart-row" key={`${item.product.id}-${item.variation}`}><div><strong>{item.product.name}</strong><span>{item.variation || ''}</span></div><div><button onClick={() => change(item, -1)}><Minus size={14} /></button><b>{item.quantity}</b><button onClick={() => change(item, 1)}><Plus size={14} /></button></div></div>) : <div className="customer-empty">Seu pedido está vazio.</div>}<div className="customer-total">Total <strong>{money(total)}</strong></div><button className="customer-primary" disabled={!cart.length} onClick={() => setStep('customer')}>Confirmar pedido <ArrowRight size={16} /></button></section>}
    {step === 'customer' && <section className="customer-panel"><button className="customer-back" onClick={() => setStep('cart')}><ArrowLeft size={16} /> Carrinho</button><h2>Confirmar seus dados</h2><p className="customer-muted">{name} · {phone}</p><button className="customer-primary" onClick={() => setStep('payment')}>Continuar <ArrowRight size={16} /></button></section>}
    {step === 'payment' && <section className="customer-panel"><button className="customer-back" onClick={() => setStep('customer')}><ArrowLeft size={16} /> Dados</button><h2>Pagamento</h2><div className="payment-choice"><button className={payment === 'PIX' ? 'active' : ''} onClick={() => setPayment('PIX')}>PIX</button><button className={payment === 'CARD' ? 'active' : ''} onClick={() => setPayment('CARD')}>Cartão</button></div><div className="customer-total">Total <strong>{money(total)}</strong></div><button className="customer-primary" disabled={sending} onClick={() => void submit()}>{sending ? 'Enviando...' : 'Simular pagamento aprovado'} <Check size={16} /></button></section>}
    {step === 'success' && order && <section className="customer-success"><div className="success-mark"><Check size={30} /></div><span>Pedido recebido</span><h2>Pedido #{order.order_number}</h2><p>Seu pedido está sendo preparado pelo lounge.</p><strong>{money(order.total)}</strong><div className="customer-status-track"><span className="active">Pedido recebido</span><span>Em preparo</span><span>Pronto</span><span>Entregue</span></div><button className="customer-primary" type="button" onClick={() => { setCart([]); setOrder(null); setStep('menu') }}>Voltar ao início</button></section>}
    {step !== 'register' && step !== 'success' && <button className="customer-cart-button" onClick={() => setStep('cart')}><ShoppingBag size={18} /><span>{cart.reduce((sum, item) => sum + item.quantity, 0)} itens</span><strong>{money(total)}</strong></button>}
  </main>
}
