import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Heart,
  History,
  LoaderCircle,
  Minus,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  ShoppingBag,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { findRoshProduct, flavorNote, isRoshCategory } from '../../lib/catalog'
import { formatMoney } from '../../lib/format'
import { catalogImage, logoImage, slugify } from '../../lib/images'
import { readJson, writeJson } from '../../lib/storage'
import { apiErrorMessage, getWebSocketUrl } from '../../services/api'
import type { Brand } from '../../services/brands'
import type { Category } from '../../services/categories'
import type { Flavor } from '../../services/flavors'
import type { Product } from '../../services/products'
import { getCustomerCatalog } from '../../services/customerCatalog'
import {
  createPublicOrder,
  getPublicOrder,
  getPublicOrderHistory,
  type PublicHistoryOrder,
  type PublicOrderResponse,
} from '../../services/publicOrders'

type Step = 'register' | 'menu' | 'category' | 'product' | 'brands' | 'flavors' | 'rosh' | 'cart' | 'customer' | 'payment' | 'success'

type CartItem = {
  product: Product
  quantity: number
  /** Shown to the customer, e.g. the Rosh flavor. */
  variation?: string
  selectedFlavorId?: string
  notes?: string
}

const FAVORITES_KEY = 'hookah-customer-favorites'
const LAST_ORDER_KEY = 'hookah-customer-last-order'
const FALLBACK_POLL_MS = 10_000
const CATALOG_REFRESH_MS = 15_000
const FINAL_STATUSES = new Set(['FINISHED', 'CANCELLED'])

const STEP_TITLES: Record<Step, string> = {
  register: 'Antes de começar',
  menu: 'Cardápio',
  category: 'Produtos',
  product: 'Produto',
  brands: 'Marcas',
  flavors: 'Sabores',
  rosh: 'Seu Rosh',
  cart: 'Seu pedido',
  customer: 'Confirmar pedido',
  payment: 'Pagamento',
  success: 'Pedido confirmado',
}

const BACK_STEP: Partial<Record<Step, Step>> = {
  category: 'menu',
  product: 'category',
  brands: 'menu',
  flavors: 'brands',
  rosh: 'flavors',
}

const STATUS_TRACK = [
  { status: 'AWAITING_PAYMENT', label: 'Aguardando pagamento' },
  { status: 'RECEIVED', label: 'Pedido recebido' },
  { status: 'PREPARING', label: 'Em preparo' },
  { status: 'READY', label: 'Pronto' },
  { status: 'FINISHED', label: 'Entregue' },
]

const STATUS_COPY: Record<string, { title: string; text: string }> = {
  AWAITING_PAYMENT: { title: 'Aguardando pagamento', text: 'Assim que o pagamento for confirmado, seu pedido segue para o lounge.' },
  RECEIVED: { title: 'Pedido recebido', text: 'Seu pedido foi enviado para o lounge.' },
  PREPARING: { title: 'Em preparo', text: 'Seu pedido está sendo preparado.' },
  READY: { title: 'Pedido pronto', text: 'Seu pedido está pronto.' },
  FINISHED: { title: 'Pedido entregue', text: 'Obrigado por pedir com a gente.' },
  CANCELLED: { title: 'Pedido cancelado', text: 'Esse pedido foi cancelado. Fale com a equipe do lounge.' },
}

const NAME_PATTERN = /^[a-zA-ZÀ-ÿ\s]+$/
const PHONE_PATTERN = /^[1-9]{2}9?[2-9][0-9]{7}$/

function isValidPhone(digits: string) {
  return PHONE_PATTERN.test(digits) && !/^(.)\1+$/.test(digits)
}

function cartKey(item: CartItem) {
  return `${item.product.id}|${item.variation ?? ''}|${item.notes ?? ''}`
}

function refreshCart(items: CartItem[], catalog: Awaited<ReturnType<typeof getCustomerCatalog>>) {
  return items.flatMap((item) => {
    const product = catalog.products.find((candidate) => candidate.id === item.product.id && candidate.active)
    if (!product) return []
    if (item.selectedFlavorId) {
      const flavor = catalog.flavors.find((candidate) => candidate.id === item.selectedFlavorId)
      const rosh = flavor ? findRoshProduct(catalog.products, catalog.categories, flavor) : null
      if (!rosh || rosh.product.id !== product.id) return []
    }
    return [{ ...item, product }]
  })
}

export function CustomerJourneyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [step, setStep] = useState<Step>('register')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [brands, setBrands] = useState<Brand[]>([])
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [allProducts, setProducts] = useState<Product[]>([])
  const [categorySelection, setSelectedCategory] = useState<Category | null>(null)
  const [productSelection, setSelectedProduct] = useState<Product | null>(null)
  const [selectedExtras, setSelectedExtras] = useState<Product[]>([])
  const [productQuantity, setProductQuantity] = useState(1)
  const [productNotes, setProductNotes] = useState('')
  const [brand, setBrand] = useState<Brand | null>(null)
  const [flavor, setFlavor] = useState<Flavor | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [order, setOrder] = useState<PublicOrderResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<string[]>(() => readJson(FAVORITES_KEY, []))
  const [lastOrder, setLastOrder] = useState<CartItem[]>(() => readJson(LAST_ORDER_KEY, []))
  const [history, setHistory] = useState<PublicHistoryOrder[]>([])
  const [onlinePayments, setOnlinePayments] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const cartRef = useRef(cart)
  cartRef.current = cart
  const products = useMemo(() => allProducts.filter((product) => product.active), [allProducts])
  const selectedProduct = products.find((product) => product.id === productSelection?.id) ?? null
  const selectedCategory = categories.find((category) => category.id === categorySelection?.id) ?? null

  function applyCatalog(catalog: Awaited<ReturnType<typeof getCustomerCatalog>>) {
    setOnlinePayments(catalog.config.online_payments_enabled)
    setBrands(catalog.brands)
    setFlavors(catalog.flavors)
    setCategories(catalog.categories)
    setProducts(catalog.products)
    setCatalogError('')
    setSelectedExtras((current) => current.flatMap((extra) => {
      const latest = catalog.products.find((product) => product.id === extra.id && product.active)
      return latest ? [latest] : []
    }))
    const previous = cartRef.current
    const updated = refreshCart(previous, catalog)
    if (updated.length < previous.length) toast.info('Itens desativados foram removidos do seu pedido. Revise o carrinho.')
    else if (updated.some((item, index) => item.product.price !== previous[index].product.price)) {
      toast.info('O preço de um item mudou. Revise o total do seu pedido.')
    }
    cartRef.current = updated
    setCart(updated)
  }
  const applyCatalogRef = useRef(applyCatalog)
  applyCatalogRef.current = applyCatalog

  useEffect(() => {
    let active = true
    let inFlight = false
    let timer: number | undefined
    async function refresh() {
      if (inFlight || document.visibilityState === 'hidden') return
      inFlight = true
      window.clearTimeout(timer)
      try {
        const catalog = await getCustomerCatalog()
        if (active) applyCatalogRef.current(catalog)
      } catch {
        if (active) setCatalogError('Não foi possível atualizar o cardápio. Verifique sua conexão; tentaremos novamente em instantes.')
      } finally {
        inFlight = false
        if (active) {
          setLoading(false)
          timer = window.setTimeout(() => void refresh(), CATALOG_REFRESH_MS)
        }
      }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    void refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      active = false
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  // Returning from the payment page (?token=...) reopens the order tracking.
  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) return
    getPublicOrder(token)
      .then((tracking) => {
        setOrder({
          order_id: token,
          order_number: tracking.order_number,
          status: tracking.status,
          total: tracking.total,
          public_token: token,
          payment_status: tracking.payment_status,
          checkout_url: null,
          pix_qr_code: tracking.pix_qr_code,
          pix_qr_code_base64: tracking.pix_qr_code_base64,
        })
        setStep('success')
      })
      .catch(() => setError('Não foi possível localizar seu pedido.'))
  }, [searchParams])

  // Live status: WebSocket first, polling if the socket drops before the order ends.
  useEffect(() => {
    if (step !== 'success' || !order?.public_token) return
    const token = order.public_token
    let pollTimer: number | undefined
    let lastStatus = order.status
    let finished = FINAL_STATUSES.has(lastStatus)

    const applyUpdate = (update: { status?: string; total?: string; payment_status?: string }) => {
      if (!update.status) return
      if (update.status === 'READY' && lastStatus !== 'READY') toast.success('Seu pedido está pronto para retirada!')
      lastStatus = update.status
      finished = FINAL_STATUSES.has(update.status)
      setOrder((current) => current && {
        ...current,
        status: update.status ?? current.status,
        total: update.total ?? current.total,
        payment_status: update.payment_status ?? current.payment_status,
      })
    }
    const startPolling = () => {
      if (finished || pollTimer) return
      pollTimer = window.setInterval(() => {
        getPublicOrder(token).then(applyUpdate).catch(() => undefined)
        if (finished) window.clearInterval(pollTimer)
      }, FALLBACK_POLL_MS)
    }

    const socket = new WebSocket(getWebSocketUrl(`/public/ws/orders/${token}`))
    socket.onmessage = (event) => applyUpdate(JSON.parse(event.data))
    socket.onclose = startPolling
    return () => {
      socket.onclose = null
      socket.close()
      window.clearInterval(pollTimer)
    }
  }, [order?.public_token, step])

  const phoneDigits = phone.replace(/\D/g, '')
  const nameValid = name.trim().length >= 2 && NAME_PATTERN.test(name.trim())
  const phoneValid = isValidPhone(phoneDigits)
  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0), [cart])
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const menuCategories = categories.filter((item) => !isRoshCategory(item))
  const menuCategoryIds = new Set(menuCategories.map((item) => item.id))
  const availableFlavors = flavors.filter((item) => findRoshProduct(allProducts, categories, item))
  const availableBrands = brands.filter((item) => availableFlavors.some((flavor) => flavor.brand_id === item.id))
  const brandFlavors = availableFlavors.filter((item) => item.brand_id === brand?.id)
  const currentFlavor = flavors.find((item) => item.id === flavor?.id)
  const rosh = currentFlavor ? findRoshProduct(allProducts, categories, currentFlavor) : null
  const extrasCategory = categories.find((category) => category.name.toLowerCase() === 'adicionais')
  const extraProducts = extrasCategory ? products.filter((product) => product.category_id === extrasCategory.id) : []
  const categoryProducts = selectedCategory ? products.filter((product) => product.category_id === selectedCategory.id) : []
  const searchTerm = search.trim().toLowerCase()
  const searchResults = searchTerm
    ? products.filter((product) => menuCategoryIds.has(product.category_id) && `${product.name} ${product.description ?? ''}`.toLowerCase().includes(searchTerm))
    : []

  function addToCart(entry: CartItem) {
    setCart((current) => {
      const key = cartKey(entry)
      const found = current.find((item) => cartKey(item) === key)
      return found
        ? current.map((item) => (item === found ? { ...item, quantity: item.quantity + entry.quantity } : item))
        : [...current, entry]
    })
  }

  function changeQuantity(target: CartItem, delta: number) {
    setCart((current) => current
      .map((item) => (item === target ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
      .filter((item) => item.quantity > 0))
  }

  /** Rebuilds a saved cart with current products/prices, dropping what is no longer sold. */
  function restoreCart(items: Array<{ productId: string; quantity: number; variation?: string; selectedFlavorId?: string; notes?: string }>) {
    const restored = items.flatMap((item) => {
      const product = products.find((candidate) => candidate.id === item.productId)
      if (item.selectedFlavorId && !availableFlavors.some((flavor) => flavor.id === item.selectedFlavorId)) return []
      return product ? [{ product, quantity: item.quantity, variation: item.variation, selectedFlavorId: item.selectedFlavorId, notes: item.notes }] : []
    })
    if (restored.length < items.length) toast.info('Alguns itens não estão mais disponíveis e foram removidos.')
    if (restored.length === 0) return
    setCart(restored)
    setStep('cart')
  }

  function openProduct(product: Product) {
    setSelectedProduct(product)
    setProductQuantity(1)
    setProductNotes('')
    setSelectedExtras([])
    setStep('product')
  }

  function toggleFavorite(productId: string) {
    setFavorites((current) => {
      const next = current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
      writeJson(FAVORITES_KEY, next)
      return next
    })
  }

  async function beginMenu() {
    setStep('menu')
    setHistory(await getPublicOrderHistory(phoneDigits).catch(() => []))
  }

  async function submit() {
    if (!cart.length) return
    setSending(true)
    setError('')
    try {
      const catalog = await getCustomerCatalog()
      const latestCart = refreshCart(cart, catalog)
      applyCatalog(catalog)
      if (latestCart.length !== cart.length || latestCart.some((item, index) => item.product.price !== cart[index].product.price)) {
        setStep('cart')
        setError('O cardápio mudou. Revise os itens e o total antes de confirmar novamente.')
        return
      }
      const created = await createPublicOrder({
        customer_name: name.trim(),
        customer_phone: phoneDigits,
        payment_method: catalog.config.online_payments_enabled ? 'PIX' : 'CASH',
        items: latestCart.map((item) => ({ product_id: item.product.id, quantity: item.quantity, notes: item.notes })),
      })
      writeJson(LAST_ORDER_KEY, cart)
      setLastOrder(cart)
      setOrder(created)
      setStep('success')
      setSearchParams({ token: created.public_token }, { replace: true })
      if (created.payment_error) setError(created.payment_error)
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível confirmar o pedido. Tente novamente.'))
    } finally {
      setSending(false)
    }
  }

  function startNewOrder() {
    setCart([])
    setOrder(null)
    setError('')
    setStep('menu')
    setSearchParams({}, { replace: true })
  }

  if (loading) {
    return <div className="customer-loading"><LoaderCircle className="spin" size={22} />Abrindo seu cardápio...</div>
  }

  const headerTitle = step === 'category' ? selectedCategory?.name ?? STEP_TITLES.category
    : step === 'product' ? selectedProduct?.name ?? STEP_TITLES.product
      : STEP_TITLES[step]
  const statusCopy = STATUS_COPY[order?.status ?? 'RECEIVED'] ?? STATUS_COPY.RECEIVED
  const awaitingPayment = order?.status === 'AWAITING_PAYMENT'

  const productButton = (product: Product) => (
    <button key={product.id} onClick={() => openProduct(product)}>
      <img {...catalogImage(product.image_url)} alt="" />
      <span>
        <strong>{product.name}</strong>
        <small>{product.description || 'Preparado para você'}</small>
      </span>
      <strong>{formatMoney(product.price)}</strong>
      <Heart
        className={favorites.includes(product.id) ? 'favorite-on' : ''}
        onClick={(event) => { event.stopPropagation(); toggleFavorite(product.id) }}
        size={16}
        aria-label={favorites.includes(product.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      />
      <ChevronRight size={17} />
    </button>
  )

  return (
    <main className="customer-app">
      <header className="customer-header">
        <div>
          <img className="customer-logo" {...logoImage} />
          <h1>{headerTitle}</h1>
          <p>{step === 'register' ? 'Identifique seu pedido em poucos segundos.' : 'Escolha com calma. O lounge cuida do resto.'}</p>
        </div>
        <div className="customer-qr"><QrCode size={20} /><span>QR do lounge</span></div>
      </header>

      {error && <div className="customer-error" role="alert">{error}</div>}
      {catalogError && <div className="customer-error" role="alert">{catalogError}</div>}

      {step === 'register' && (
        <section className="customer-panel customer-register">
          <h2>Como podemos te chamar?</h2>
          <label>
            Nome
            <input minLength={2} maxLength={120} autoComplete="name" placeholder="Seu nome" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            WhatsApp
            <input inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <small>Usaremos esses dados apenas para identificar e acompanhar seu pedido.</small>
          {name.trim().length > 0 && !nameValid && <small className="customer-validation">Informe seu nome (apenas letras).</small>}
          {phone.length > 0 && !phoneValid && <small className="customer-validation">Informe um telefone válido com DDD.</small>}
          <button className="customer-primary" disabled={!nameValid || !phoneValid} onClick={() => void beginMenu()}>
            Continuar <ArrowRight size={16} />
          </button>
        </section>
      )}

      {step === 'menu' && (
        <section className="journey-menu">
          <label className="customer-search">
            <Search size={16} />
            <input placeholder="Buscar produtos" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          {searchTerm ? (
            <div className="journey-options">
              {searchResults.length ? searchResults.map(productButton) : <div className="customer-empty">Nenhum produto encontrado.</div>}
            </div>
          ) : (
            <>
              {availableBrands.length > 0 && <div className="journey-feature">
                <img {...catalogImage('/images/banner-rosh.webp')} loading="eager" alt="Rosh com frutas" />
                <div>
                  <span>Mais pedidos</span>
                  <h2>Rosh</h2>
                  <p>Escolha uma marca e descubra os sabores.</p>
                  <button onClick={() => setStep('brands')}>Escolher Rosh <ArrowRight size={16} /></button>
                </div>
              </div>}
              {history.length > 0 && (
                <div className="journey-history">
                  <h3>Pedidos anteriores</h3>
                  {history.slice(0, 3).map((item) => (
                    <button key={item.order_number} onClick={() => restoreCart(item.items.map((entry) => ({ productId: entry.product_id, quantity: entry.quantity, notes: entry.notes ?? undefined })))}>
                      <History size={16} />
                      <span>
                        <strong>{item.items.map((entry) => `${entry.quantity}x ${entry.product_name}`).join(', ')}</strong>
                        <small>{new Date(item.created_at).toLocaleDateString('pt-BR')} · {formatMoney(item.total)}</small>
                      </span>
                      <RotateCcw size={15} aria-label="Pedir de novo" />
                    </button>
                  ))}
                </div>
              )}
              {history.length === 0 && lastOrder.length > 0 && (
                <button className="journey-reorder" onClick={() => restoreCart(lastOrder.map((entry) => ({ productId: entry.product.id, quantity: entry.quantity, variation: entry.variation, selectedFlavorId: entry.selectedFlavorId, notes: entry.notes })))}>
                  <History size={16} />
                  <span>Repetir último pedido</span>
                  <RotateCcw size={15} />
                </button>
              )}
              <h3>Categorias</h3>
              <div className="journey-categories">
                {menuCategories.map((category) => (
                  <button key={category.id} onClick={() => { setSelectedCategory(category); setStep('category') }}>
                    <img {...catalogImage(category.image_url, `categorias/${slugify(category.name)}`)} alt="" />
                    <span>{category.name}</span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {step === 'category' && (
        <section className="journey-panel">
          <button className="customer-back" onClick={() => setStep('menu')}><ArrowLeft size={16} /> Categorias</button>
          <div className="journey-options">
            {categoryProducts.length ? categoryProducts.map(productButton) : <div className="customer-empty">Nenhum produto disponível nesta categoria.</div>}
          </div>
        </section>
      )}

      {step === 'product' && selectedProduct && (
        <section className="journey-panel journey-product-panel">
          <button className="customer-back" onClick={() => setStep(searchTerm ? 'menu' : 'category')}><ArrowLeft size={16} /> Voltar</button>
          <img className="journey-product-image" {...catalogImage(selectedProduct.image_url)} alt={selectedProduct.name} />
          <span className="customer-product-tag">{categories.find((category) => category.id === selectedProduct.category_id)?.name}</span>
          <h2>{selectedProduct.name}</h2>
          <p>{selectedProduct.description || 'Preparado para você'}</p>
          <textarea className="customer-note" placeholder="Observação para este item (opcional)" value={productNotes} onChange={(event) => setProductNotes(event.target.value)} maxLength={300} />
          <div className="journey-quantity">
            <span>Quantidade</span>
            <button onClick={() => setProductQuantity((value) => Math.max(1, value - 1))} aria-label="Diminuir"><Minus size={15} /></button>
            <strong>{productQuantity}</strong>
            <button onClick={() => setProductQuantity((value) => Math.min(20, value + 1))} aria-label="Aumentar"><Plus size={15} /></button>
          </div>
          {extraProducts.length > 0 && selectedProduct.category_id !== extrasCategory?.id && (
            <>
              <h3>Adicionais</h3>
              <div className="journey-extras">
                {extraProducts.slice(0, 6).map((extra) => {
                  const selected = selectedExtras.some((item) => item.id === extra.id)
                  return (
                    <button
                      className={selected ? 'selected' : ''}
                      key={extra.id}
                      aria-pressed={selected}
                      onClick={() => setSelectedExtras((current) => (selected ? current.filter((item) => item.id !== extra.id) : [...current, extra]))}
                    >
                      <img {...catalogImage(extra.image_url)} alt="" />
                      <span>{extra.name}</span>
                      <b>{formatMoney(extra.price)}</b>
                    </button>
                  )
                })}
              </div>
            </>
          )}
          {step === 'product' && !selectedProduct && (
            <section className="customer-panel">
              <h2>Produto indisponível</h2>
              <p>Este produto foi desativado. Escolha outro item do cardápio.</p>
              <button className="customer-primary" onClick={() => setStep('menu')}>Voltar ao cardápio</button>
            </section>
          )}
          <button
            className="customer-primary"
            onClick={() => {
              addToCart({ product: selectedProduct, quantity: productQuantity, notes: productNotes.trim() || undefined })
              selectedExtras.forEach((extra) => addToCart({ product: extra, quantity: 1 }))
              toast.success(`${selectedProduct.name} adicionado ao pedido.`)
              setStep('cart')
            }}
          >
            Adicionar ao pedido <Plus size={16} />
          </button>
        </section>
      )}

      {(step === 'brands' || step === 'flavors' || step === 'rosh') && (
        <section className="journey-panel">
          <button className="customer-back" onClick={() => setStep(BACK_STEP[step] ?? 'menu')}><ArrowLeft size={16} /> Voltar</button>
          {step === 'brands' && (
            <div className="journey-options">
              {availableBrands.map((item) => (
                <button key={item.id} onClick={() => { setBrand(item); setStep('flavors') }}>
                  <img {...catalogImage(item.image_url, `marcas/${slugify(item.name)}`)} alt="" />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{availableFlavors.filter((entry) => entry.brand_id === item.id).length} sabores disponíveis</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          )}
          {step === 'flavors' && (
            <div className="journey-options">
              {brandFlavors.map((item) => (
                <button key={item.id} onClick={() => { setFlavor(item); setStep('rosh') }}>
                  <img {...catalogImage(item.image_url)} alt="" />
                  <span><strong>{item.name}</strong><small>{brand?.name}</small></span>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          )}
          {step === 'rosh' && flavor && (
            <article className="journey-rosh-card">
              {rosh ? (
                <>
                  <img {...catalogImage(rosh.product.image_url || currentFlavor?.image_url)} alt={`Rosh ${currentFlavor?.name}`} />
                  <span>{brand?.name}</span>
                  <h2>Rosh</h2>
                  <p>Sabor {flavor.name}</p>
                  <strong>{formatMoney(rosh.product.price)}</strong>
                  <button
                    onClick={() => {
                      addToCart({
                        product: rosh.product,
                        quantity: 1,
                        selectedFlavorId: currentFlavor?.id,
                        variation: `${brand?.name ?? ''} ${flavor.name}`.trim(),
                        notes: rosh.exact ? undefined : flavorNote(brand ?? undefined, flavor),
                      })
                      toast.success(`Rosh ${flavor.name} adicionado ao pedido.`)
                      setStep('cart')
                    }}
                  >
                    Adicionar ao pedido <Plus size={16} />
                  </button>
                </>
              ) : (
                <>
                  <h2>Sabor indisponível</h2>
                  <p>Este sabor não está disponível no momento.</p>
                  <button className="customer-primary" onClick={() => setStep('flavors')}>Voltar aos sabores</button>
                </>
              )}
            </article>
          )}
        </section>
      )}

      {step === 'cart' && (
        <section className="customer-panel">
          <button className="customer-back" onClick={() => setStep('menu')}><ArrowLeft size={16} /> Menu</button>
          <h2>Resumo do pedido</h2>
          {cart.length ? cart.map((item) => (
            <div className="customer-cart-row" key={cartKey(item)}>
              <img {...catalogImage(item.product.image_url)} alt="" />
              <div>
                <strong>{item.product.name}</strong>
                <span>{[item.variation, item.notes && !item.notes.startsWith('Sabor:') ? item.notes : ''].filter(Boolean).join(' · ')}</span>
              </div>
              <div>
                <button onClick={() => changeQuantity(item, -1)} aria-label="Diminuir"><Minus size={14} /></button>
                <b>{item.quantity}</b>
                <button onClick={() => changeQuantity(item, 1)} aria-label="Aumentar"><Plus size={14} /></button>
              </div>
            </div>
          )) : <div className="customer-empty">Seu pedido está vazio.</div>}
          <div className="customer-total">Total <strong>{formatMoney(total)}</strong></div>
          <button className="customer-primary" disabled={!cart.length} onClick={() => setStep('customer')}>Confirmar pedido <ArrowRight size={16} /></button>
        </section>
      )}

      {step === 'customer' && (
        <section className="customer-panel">
          <button className="customer-back" onClick={() => setStep('cart')}><ArrowLeft size={16} /> Carrinho</button>
          <h2>Confirmar seus dados</h2>
          <p className="customer-muted">{name.trim()} · {phone}</p>
          {!onlinePayments && <p className="customer-muted">Pagamento no balcão. Seu pedido será enviado direto para a equipe, sem pagamento online.</p>}
          <div className="customer-total">Total <strong>{formatMoney(total)}</strong></div>
          <button className="customer-primary" disabled={sending} onClick={() => onlinePayments ? setStep('payment') : void submit()}>
            {sending ? 'Enviando...' : onlinePayments ? 'Continuar' : 'Enviar pedido'} <ArrowRight size={16} />
          </button>
        </section>
      )}

      {step === 'payment' && onlinePayments && (
        <section className="customer-panel">
          <button className="customer-back" onClick={() => setStep('customer')}><ArrowLeft size={16} /> Dados</button>
          <h2>Pagamento</h2>
          <div className="payment-choice"><button className="active" disabled>PIX</button></div>
          <div className="customer-total">Total <strong>{formatMoney(total)}</strong></div>
          <button className="customer-primary" disabled={sending} onClick={() => void submit()}>
            {sending ? 'Enviando...' : 'Ir para pagamento'} <Check size={16} />
          </button>
        </section>
      )}

      {step === 'success' && order && (
        <section className="customer-success">
          {order.payment_status !== 'PAID' && awaitingPayment && (order.pix_qr_code_base64 || order.pix_qr_code) && (
            <div className="customer-pix-box">
              <span>Escaneie o QR Code ou copie o código Pix</span>
              {order.pix_qr_code_base64 && <img className="pix-qr-image" src={`data:image/png;base64,${order.pix_qr_code_base64}`} alt="QR Code Pix" />}
              {order.pix_qr_code && (
                <button
                  type="button"
                  className="customer-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(order.pix_qr_code ?? '')
                      .then(() => toast.success('Código Pix copiado.'))
                      .catch(() => toast.error('Não foi possível copiar. Use o QR Code.'))
                  }}
                >
                  Copiar código Pix
                </button>
              )}
              <small>Aguardando confirmação do pagamento...</small>
            </div>
          )}
          <div className={awaitingPayment ? 'success-mark success-mark-pending' : 'success-mark'}>
            {awaitingPayment ? <Clock size={30} /> : <Check size={30} />}
          </div>
          <span className={awaitingPayment ? 'status-label-pending' : ''}>{statusCopy.title}</span>
          <h2>Pedido #{order.order_number}</h2>
          <p>{statusCopy.text}</p>
          {!onlinePayments && <p>Pagamento no balcão.</p>}
          <strong>{formatMoney(order.total)}</strong>
          <div className="customer-status-track">
            {STATUS_TRACK.filter((item) => onlinePayments || item.status !== 'AWAITING_PAYMENT').map((item) => <span key={item.status} className={order.status === item.status ? 'active' : ''}>{item.label}</span>)}
          </div>
          <Link className="customer-back" to="/pedidos">Acompanhar todos os pedidos <ArrowRight size={16} /></Link>
          <button className="customer-primary" type="button" onClick={startNewOrder}>Voltar ao início</button>
        </section>
      )}

      {step === 'menu' && <>
        <Link className="customer-credits" to="/pedidos">Acompanhar pedidos</Link>
        <Link className="customer-credits" to="/creditos">Créditos das imagens</Link>
      </>}

      {step !== 'register' && step !== 'success' && (
        <button className="customer-cart-button" onClick={() => setStep('cart')}>
          <ShoppingBag size={18} />
          <span>{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
          <strong>{formatMoney(total)}</strong>
        </button>
      )}
    </main>
  )
}
