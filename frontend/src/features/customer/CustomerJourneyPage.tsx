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
} from "lucide-react";
import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { getBrands, type Brand } from "../../services/brands";
import { getCategories, type Category } from "../../services/categories";
import { getFlavors, type Flavor } from "../../services/flavors";
import { getProducts, type Product } from "../../services/products";
import { getWebSocketUrl } from "../../services/api";
import {
  createPublicOrder,
  getPublicOrder,
  getPublicOrderHistory,
  type PublicHistoryOrder,
  type PublicOrderResponse,
} from "../../services/publicOrders";
import { MercadoPagoWallet } from "./MercadoPagoWallet";
import { useSearchParams } from "react-router-dom";
import { number } from "zod";

type Step =
  | "register"
  | "menu"
  | "category"
  | "product"
  | "brands"
  | "flavors"
  | "rosh"
  | "cart"
  | "customer"
  | "payment"
  | "success";
type CartItem = {
  product: Product;
  quantity: number;
  variation?: string;
  notes?: string;
};
const money = (value: string | number) =>
  `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
// Single neutral placeholder. Real photos come from the API via `image_url`;
// we never fall back to generic stock images.
const PLACEHOLDER_IMAGE = "/images/placeholder.svg";
const resolveImage = (url?: string | null) =>
  url && url.trim().length > 0 ? url : PLACEHOLDER_IMAGE;
const onImageError = (event: SyntheticEvent<HTMLImageElement>) => {
  if (event.currentTarget.src.endsWith(PLACEHOLDER_IMAGE)) return;
  event.currentTarget.src = PLACEHOLDER_IMAGE;
};
// Extension-agnostic image loading: given a base path without extension (e.g.
// `/images/categorias/acessorios`), the <img> tries each extension in order and
// falls back to the neutral placeholder. Lets you drop any file format and just
// refresh — no backfill, no DB update needed.
const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "jfif", "svg"];
const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const autoImage = (base: string) => ({
  src: `${base}.${IMAGE_EXTS[0]}`,
  "data-base": base,
  "data-ext": "0",
  onError: (event: SyntheticEvent<HTMLImageElement>) => {
    const el = event.currentTarget;
    const next = Number(el.dataset.ext ?? "0") + 1;
    if (next < IMAGE_EXTS.length) {
      el.dataset.ext = String(next);
      el.src = `${el.dataset.base}.${IMAGE_EXTS[next]}`;
    } else if (!el.src.endsWith(PLACEHOLDER_IMAGE)) {
      el.src = PLACEHOLDER_IMAGE;
    }
  },
});

export function CustomerJourneyPage() {
  const [step, setStep] = useState<Step>("register");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<Product[]>([]);
  const [productQuantity, setProductQuantity] = useState(1);
  const [productNotes, setProductNotes] = useState("");
  const [brand, setBrand] = useState<Brand | null>(null);
  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState<"PIX">("PIX");
  const [order, setOrder] = useState<PublicOrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem("hookah-customer-favorites") ?? "[]"),
  );
  const [lastOrder, setLastOrder] = useState<CartItem[]>(() =>
    JSON.parse(localStorage.getItem("hookah-customer-last-order") ?? "[]"),
  );
  const [history, setHistory] = useState<PublicHistoryOrder[]>([]);
  const [liveStatus, setLiveStatus] = useState("RECEIVED");

  useEffect(() => {
    Promise.all([getBrands(), getFlavors(), getCategories(), getProducts()])
      .then(
        ([loadedBrands, loadedFlavors, loadedCategories, loadedProducts]) => {
          setBrands(loadedBrands.filter((item) => item.active));
          setFlavors(loadedFlavors.filter((item) => item.active));
          setCategories(loadedCategories.filter((item) => item.active));
          setProducts(loadedProducts.filter((item) => item.active));
        },
      )
      .catch(() => setError("Não foi possível carregar o cardápio."))
      .finally(() => setLoading(false));
  }, []);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;
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
        });
        setLiveStatus(tracking.status);
        setStep("success");
      })
      .catch(() => setError("Não foi possível localizar seu pedido."));
  }, [searchParams]);

  useEffect(() => {
    if (step !== "success" || !order?.public_token) return;
    const socket = new WebSocket(
      getWebSocketUrl(`/public/ws/orders/${order.public_token}`),
    );
    socket.onmessage = (event) => {
      const update = JSON.parse(event.data) as {
        status?: string;
        total?: string;
        payment_status?: string;
      };
      if (!update.status) return;
      setLiveStatus(update.status);
      setOrder((current) =>
        current
          ? {
              ...current,
              status: update.status ?? current.status,
              total: update.total ?? current.total,
              payment_status: update.payment_status ?? current.payment_status,
            }
          : current,
      );
      if (update.status === "READY")
        setError("Seu pedido está pronto para retirada.");
    };
    socket.onerror = () =>
      void getPublicOrder(order.public_token).then((tracking) =>
        setOrder((current) =>
          current
            ? { ...current, status: tracking.status, total: tracking.total }
            : current,
        ),
      );
    return () => socket.close();
  }, [order?.public_token, step]);

  const roshCategory = categories.find((item) =>
    ["rosh", "essências"].includes(item.name.toLowerCase()),
  );
  const brandFlavors = flavors.filter((item) => item.brand_id === brand?.id);
  const rosh = products.find(
    (item) =>
      item.category_id === roshCategory?.id &&
      item.flavor_id &&
      brandFlavors.some((itemFlavor) => itemFlavor.id === item.flavor_id),
  );
  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0,
      ),
    [cart],
  );
  const phoneDigits = phone.replace(/\D/g, "");
  const validIdentity =
    name.trim().length >= 2 &&
    phoneDigits.length >= 10 &&
    phoneDigits.length <= 11;
  const categoryProducts = selectedCategory
    ? products.filter((product) => product.category_id === selectedCategory.id)
    : [];
  const filteredProducts = categoryProducts.filter((product) =>
    `${product.name} ${product.description ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const add = (product: Product, variation?: string, notes?: string) =>
    setCart((current) => {
      const found = current.find(
        (item) =>
          item.product.id === product.id &&
          item.variation === variation &&
          item.notes === notes,
      );
      return found
        ? current.map((item) =>
            item === found ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [...current, { product, quantity: 1, variation, notes }];
    });
  const change = (item: CartItem, delta: number) =>
    setCart((current) =>
      current
        .map((entry) =>
          entry === item
            ? { ...entry, quantity: Math.max(0, entry.quantity + delta) }
            : entry,
        )
        .filter((entry) => entry.quantity > 0),
    );
  const back = () =>
    setStep(
      step === "product"
        ? "category"
        : step === "category"
          ? "menu"
          : step === "brands"
            ? "menu"
            : step === "flavors"
              ? "brands"
              : step === "rosh"
                ? "flavors"
                : step === "cart"
                  ? "menu"
                  : "menu",
    );
  const extras = categories.find(
    (category) => category.name.toLowerCase() === "adicionais",
  );
  const extraProducts = extras
    ? products.filter((product) => product.category_id === extras.id)
    : [];
  async function submit() {
    if (!name || !phone || !cart.length) return;
    setSending(true);
    try {
      const created = await createPublicOrder({
        customer_name: name,
        customer_phone: phone,
        payment_method: payment,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
      });
      localStorage.setItem("hookah-customer-last-order", JSON.stringify(cart));
      setLastOrder(cart);
      setLiveStatus(created.status);
      setOrder(created);
      setStep("success");
    } catch {
      setError("Não foi possível confirmar o pedido.");
    } finally {
      setSending(false);
    }
  }

  function toggleFavorite(productId: string) {
    setFavorites((current) => {
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      localStorage.setItem("hookah-customer-favorites", JSON.stringify(next));
      return next;
    });
  }
  async function beginMenu() {
    const orders = await getPublicOrderHistory(phone).catch(() => []);
    setHistory(orders);
    setStep("menu");
  }
  function repeatHistoryOrder(historyOrder: PublicHistoryOrder) {
    const repeated: CartItem[] = historyOrder.items.flatMap((item) => {
      const product = products.find(
        (candidate) => candidate.id === item.product_id,
      );
      return product
        ? [{ product, quantity: item.quantity, notes: item.notes ?? undefined }]
        : [];
    });
    setCart(repeated);
    setStep("cart");
  }
  {
    step === "register" && (
      <section className="customer-panel customer-register">
        <h2>Como podemos te chamar?</h2>
        <label>
          Nome
          <input
            placeholder="João Vitor"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          WhatsApp
          <input
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <small>
          Usaremos esses dados apenas para identificar e acompanhar seu pedido.
        </small>
        <button
          className="customer-primary"
          disabled={!name.trim() || !phone.trim()}
          onClick={() => void beginMenu()}
        >
          Continuar <ArrowRight size={16} />
        </button>
      </section>
    );
  }
  {
    step === "menu" && (
      <section className="journey-menu">
        <label className="customer-search">
          <Search size={16} />
          <input
            placeholder="Buscar produtos"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="journey-feature">
          <img {...autoImage("/images/banner-rosh")} alt="Rosh com frutas" />
          <div>
            <span>Mais pedidos</span>
            <h2>Rosh</h2>
            <p>Escolha uma marca e descubra os sabores.</p>
            <button onClick={() => setStep("brands")}>
              Escolher Rosh <ArrowRight size={16} />
            </button>
          </div>
        </div>
        {history.length > 0 && (
          <div className="journey-history">
            <h3>Pedidos anteriores</h3>
            {history.slice(0, 3).map((item) => (
              <button
                key={item.order_number}
                onClick={() => repeatHistoryOrder(item)}
              >
                <History size={16} />
                <span>
                  Pedido #{item.order_number} · {money(item.total)}
                </span>
                <RotateCcw size={15} />
              </button>
            ))}
          </div>
        )}
        {lastOrder.length > 0 && (
          <button
            className="journey-reorder"
            onClick={() => {
              setCart(lastOrder);
              setStep("cart");
            }}
          >
            <History size={16} /> Repetir último pedido <RotateCcw size={15} />
          </button>
        )}
        <h3>Categorias</h3>
        <div className="journey-categories">
          {categories
            .filter(
              (item) =>
                !["rosh", "essências"].includes(item.name.toLowerCase()),
            )
            .map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category);
                  setStep("category");
                }}
              >
                <img
                  {...autoImage("/images/categorias/" + slugify(category.name))}
                  alt=""
                />
                <span>{category.name}</span>
                <ChevronRight size={16} />
              </button>
            ))}
        </div>
      </section>
    );
  }

  if (loading)
    return (
      <div className="customer-loading">
        <LoaderCircle className="spin" size={22} />
        Abrindo seu cardápio...
      </div>
    );
  const headerTitle = {
    register: "Antes de começar",
    menu: "Cardápio",
    category: selectedCategory?.name ?? "Produtos",
    product: selectedProduct?.name ?? "Produto",
    brands: "Marcas",
    flavors: "Sabores",
    rosh: "Seu Rosh",
    cart: "Seu pedido",
    customer: "Confirmar pedido",
    payment: "Pagamento",
    success: "Pedido confirmado",
  }[step];
  const header = (
    <header className="customer-header">
      <div>
        <img
          className="customer-logo"
          src="/images/logo.jpeg"
          alt="Hookah Drive"
        />
        <h1>{headerTitle}</h1>
        <p>
          {step === "register"
            ? "Identifique seu pedido em poucos segundos."
            : "Escolha com calma. O lounge cuida do resto."}
        </p>
      </div>
      <div className="customer-qr">
        <QrCode size={20} />
        <span>QR do lounge</span>
      </div>
    </header>
  );

  return (
    <main className="customer-app">
      {header}
      {error && <div className="customer-error">{error}</div>}
      {step === "register" && (
        <section className="customer-panel customer-register">
          <h2>Como podemos te chamar?</h2>
          <label>
            Nome
            <input
              minLength={2}
              placeholder="Seu nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            WhatsApp
            <input
              inputMode="tel"
              placeholder="Seu WhatsApp"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <small>
            Usaremos esses dados apenas para identificar e acompanhar seu
            pedido.
          </small>
          {name.trim().length > 0 && !/^[a-zA-ZÀ-ÿ\s]+$/.test(name) && (
            <small className="customer-validation">
              Informe seu nome completo (apenas letras).
            </small>
          )}
          {phone.length > 0 &&
            (phoneDigits.length < 10 ||
              phoneDigits.length > 11 ||
              /^(.)\1+$/.test(phoneDigits) ||
              !/^[1-9]{2}9?[2-9][0-9]{7}$/.test(phoneDigits)) && (
              <small className="customer-validation">
                Informe um telefone válido com DDD.
              </small>
            )}

          <button
            className="customer-primary"
            disabled={!validIdentity}
            onClick={() => setStep("menu")}
          >
            Continuar <ArrowRight size={16} />
          </button>
        </section>
      )}
      {step === "menu" && (
        <section className="journey-menu">
          <label className="customer-search">
            <Search size={16} />
            <input
              placeholder="Buscar produtos"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="journey-feature">
            <img {...autoImage("/images/banner-rosh")} alt="Rosh com frutas" />
            <div>
              <span>Mais pedidos</span>
              <h2>Rosh</h2>
              <p>Escolha uma marca e descubra os sabores.</p>
              <button onClick={() => setStep("brands")}>
                Escolher Rosh <ArrowRight size={16} />
              </button>
            </div>
          </div>
          {lastOrder.length > 0 && (
            <button
              className="journey-reorder"
              onClick={() => {
                setCart(lastOrder);
                setStep("cart");
              }}
            >
              <History size={16} />
              <span>Repetir último pedido</span>
              <RotateCcw size={15} />
            </button>
          )}
          <h3>Categorias</h3>
          <div className="journey-categories">
            {categories
              .filter(
                (item) =>
                  !["rosh", "essências"].includes(item.name.toLowerCase()),
              )
              .map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category);
                    setStep("category");
                  }}
                >
                  <img
                    {...autoImage(
                      "/images/categorias/" + slugify(category.name),
                    )}
                    alt=""
                  />
                  <span>{category.name}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
          </div>
        </section>
      )}
      {step === "category" && (
        <section className="journey-panel">
          <button className="customer-back" onClick={back}>
            <ArrowLeft size={16} /> Categorias
          </button>
          <div className="journey-options">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  setSelectedProduct(product);
                  setProductQuantity(1);
                  setSelectedExtras([]);
                  setStep("product");
                }}
              >
                <img
                  src={resolveImage(product.image_url)}
                  onError={onImageError}
                  alt=""
                />
                <span>
                  <strong>{product.name}</strong>
                  <small>{product.description || "Preparado para você"}</small>
                </span>
                <strong>{money(product.price)}</strong>
                <Heart
                  className={
                    favorites.includes(product.id) ? "favorite-on" : ""
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleFavorite(product.id);
                  }}
                  size={16}
                />
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </section>
      )}
      {step === "product" && selectedProduct && (
        <section className="journey-panel journey-product-panel">
          <button className="customer-back" onClick={back}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <img
            className="journey-product-image"
            src={resolveImage(selectedProduct.image_url)}
            onError={onImageError}
            alt={selectedProduct.name}
          />
          <span className="customer-product-tag">{selectedCategory?.name}</span>
          <h2>{selectedProduct.name}</h2>
          <p>{selectedProduct.description || "Preparado para você"}</p>
          <textarea
            className="customer-note"
            placeholder="Observação para este item (opcional)"
            value={productNotes}
            onChange={(event) => setProductNotes(event.target.value)}
            maxLength={300}
          />{" "}
          <div className="journey-quantity">
            <span>Quantidade</span>
            <button
              onClick={() =>
                setProductQuantity((value) => Math.max(1, value - 1))
              }
            >
              <Minus size={15} />
            </button>
            <strong>{productQuantity}</strong>
            <button onClick={() => setProductQuantity((value) => value + 1)}>
              <Plus size={15} />
            </button>
          </div>
          {extraProducts.length > 0 && (
            <>
              <h3>Adicionais</h3>
              <div className="journey-extras">
                {extraProducts.slice(0, 6).map((extra) => (
                  <button
                    className={
                      selectedExtras.some((item) => item.id === extra.id)
                        ? "selected"
                        : ""
                    }
                    key={extra.id}
                    onClick={() =>
                      setSelectedExtras((current) =>
                        current.some((item) => item.id === extra.id)
                          ? current.filter((item) => item.id !== extra.id)
                          : [...current, extra],
                      )
                    }
                  >
                    <img
                      src={resolveImage(extra.image_url)}
                      onError={onImageError}
                      alt=""
                    />
                    <span>{extra.name}</span>
                    <b>{money(extra.price)}</b>
                  </button>
                ))}
              </div>
            </>
          )}
          <button
            className="customer-primary"
            onClick={() => {
              add(selectedProduct, undefined, productNotes);
              for (let index = 1; index < productQuantity; index += 1)
                add(selectedProduct, undefined, productNotes);
              selectedExtras.forEach((extra) => add(extra));
              setStep("cart");
            }}
          >
            Adicionar ao pedido <Plus size={16} />
          </button>
        </section>
      )}
      {(step === "brands" || step === "flavors" || step === "rosh") && (
        <section className="journey-panel">
          <button className="customer-back" onClick={back}>
            <ArrowLeft size={16} /> Voltar
          </button>
          {step === "brands" && (
            <div className="journey-options">
              {brands.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setBrand(item);
                    setStep("flavors");
                  }}
                >
                  <img
                    {...autoImage("/images/marcas/" + slugify(item.name))}
                    alt=""
                  />
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {
                        flavors.filter(
                          (itemFlavor) => itemFlavor.brand_id === item.id,
                        ).length
                      }{" "}
                      sabores disponíveis
                    </small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          )}
          {step === "flavors" && (
            <div className="journey-options">
              {brandFlavors.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setFlavor(item);
                    setStep("rosh");
                  }}
                >
                  <img
                    src={resolveImage(item.image_url)}
                    onError={onImageError}
                    alt=""
                  />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{brand?.name}</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          )}
          {step === "rosh" && rosh && flavor && (
            <article className="journey-rosh-card">
              <img
                src={resolveImage(flavor.image_url)}
                onError={onImageError}
                alt="Rosh"
              />
              <span>{brand?.name}</span>
              <h2>Rosh</h2>
              <p>Sabor {flavor.name}</p>
              <strong>{money(rosh.price)}</strong>
              <button
                onClick={() => {
                  add(rosh, flavor.name);
                  setStep("cart");
                }}
              >
                Adicionar ao pedido <Plus size={16} />
              </button>
            </article>
          )}
        </section>
      )}
      {step === "cart" && (
        <section className="customer-panel">
          <button className="customer-back" onClick={() => setStep("menu")}>
            <ArrowLeft size={16} /> Menu
          </button>
          <h2>Resumo do pedido</h2>
          {cart.length ? (
            cart.map((item) => (
              <div
                className="customer-cart-row"
                key={`${item.product.id}-${item.variation}`}
              >
                <img
                  src={resolveImage(item.product.image_url)}
                  onError={onImageError}
                  alt=""
                />
                <div>
                  <strong>{item.product.name}</strong>
                  <span>
                    {item.variation || ""}
                    {item.notes ? ` · ${item.notes}` : ""}
                  </span>
                </div>
                <div>
                  <button onClick={() => change(item, -1)}>
                    <Minus size={14} />
                  </button>
                  <b>{item.quantity}</b>
                  <button onClick={() => change(item, 1)}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="customer-empty">Seu pedido está vazio.</div>
          )}
          <div className="customer-total">
            Total <strong>{money(total)}</strong>
          </div>
          <button
            className="customer-primary"
            disabled={!cart.length}
            onClick={() => setStep("customer")}
          >
            Confirmar pedido <ArrowRight size={16} />
          </button>
        </section>
      )}
      {step === "customer" && (
        <section className="customer-panel">
          <button className="customer-back" onClick={() => setStep("cart")}>
            <ArrowLeft size={16} /> Carrinho
          </button>
          <h2>Confirmar seus dados</h2>
          <p className="customer-muted">
            {name} · {phone}
          </p>
          <button
            className="customer-primary"
            onClick={() => setStep("payment")}
          >
            Continuar <ArrowRight size={16} />
          </button>
        </section>
      )}
      {step === "payment" && (
        <section className="customer-panel">
          <button className="customer-back" onClick={() => setStep("customer")}>
            <ArrowLeft size={16} /> Dados
          </button>
          <h2>Pagamento</h2>
          <div className="payment-choice">
            <button className="active" disabled>
              PIX
            </button>
          </div>
          <div className="customer-total">
            Total <strong>{money(total)}</strong>
          </div>
          <button
            className="customer-primary"
            disabled={sending}
            onClick={() => void submit()}
          >
            {sending ? "Enviando..." : "Ir para pagamento"} <Check size={16} />
          </button>
        </section>
      )}
      {step === "success" && order && (
        <section className="customer-success">
          {order.payment_status !== "PAID" &&
            (order.pix_qr_code_base64 || order.pix_qr_code) && (
              <div className="customer-pix-box">
                <span>Escaneie o QR Code ou copie o código Pix</span>
                {order.pix_qr_code_base64 && (
                  <img
                    className="pix-qr-image"
                    src={`data:image/png;base64,${order.pix_qr_code_base64}`}
                    alt="QR Code Pix"
                  />
                )}
                {order.pix_qr_code && (
                  <button
                    type="button"
                    className="customer-primary"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        order.pix_qr_code ?? "",
                      );
                      setError("Código Pix copiado.");
                    }}
                  >
                    Copiar código Pix
                  </button>
                )}
                <small>Aguardando confirmação do pagamento...</small>
              </div>
            )}
          <div
            className={
              liveStatus === "AWAITING_PAYMENT"
                ? "success-mark success-mark-pending"
                : "success-mark"
            }
          >
            {liveStatus === "AWAITING_PAYMENT" ? (
              <Clock size={30} />
            ) : (
              <Check size={30} />
            )}
          </div>
          <span
            className={
              liveStatus === "AWAITING_PAYMENT" ? "status-label-pending" : ""
            }
          >
            {liveStatus === "FINISHED"
              ? "Pedido entregue"
              : liveStatus === "CANCELLED"
                ? "Pedido cancelado"
                : liveStatus === "READY"
                  ? "Pedido pronto"
                  : liveStatus === "AWAITING_PAYMENT"
                    ? "Aguardando pagamento"
                    : "Pedido recebido"}
          </span>
          <h2>Pedido #{order.order_number}</h2>
          <p>
            {liveStatus === "AWAITING_PAYMENT"
              ? "Assim que o pagamento for confirmado, seu pedido segue para o lounge."
              : liveStatus === "PREPARING"
                ? "Seu pedido está sendo preparado."
                : liveStatus === "READY"
                  ? "Seu pedido está pronto."
                  : liveStatus === "FINISHED"
                    ? "Obrigado por pedir com a gente."
                    : liveStatus === "CANCELLED"
                      ? "Esse pedido foi cancelado."
                      : "Seu pedido foi enviado para o lounge."}
          </p>
          <strong>{money(order.total)}</strong>
          <div className="customer-status-track">
            <span className={liveStatus === "AWAITING_PAYMENT" ? "active" : ""}>
              Aguardando pagamento
            </span>
            <span className={liveStatus === "RECEIVED" ? "active" : ""}>
              Pedido recebido
            </span>
            <span className={liveStatus === "PREPARING" ? "active" : ""}>
              Em preparo
            </span>
            <span className={liveStatus === "READY" ? "active" : ""}>
              Pronto
            </span>
            <span className={liveStatus === "FINISHED" ? "active" : ""}>
              Entregue
            </span>
          </div>
          <button
            className="customer-primary"
            type="button"
            onClick={() => {
              setCart([]);
              setOrder(null);
              setStep("menu");
            }}
          >
            Voltar ao início
          </button>
        </section>
      )}
      {step !== "register" && step !== "success" && (
        <button
          className="customer-cart-button"
          onClick={() => setStep("cart")}
        >
          <ShoppingBag size={18} />
          <span>
            {cart.reduce((sum, item) => sum + item.quantity, 0)} itens
          </span>
          <strong>{money(total)}</strong>
        </button>
      )}
    </main>
  );
}
