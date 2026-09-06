import { AlertCircle, Check, ChevronDown, CircleOff, Eye, EyeOff, LoaderCircle, Plus } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { getCategories, type Category } from '../../services/categories'
import { getBrands, type Brand } from '../../services/brands'
import { getFlavors, type Flavor } from '../../services/flavors'
import { createProduct, getProducts, updateProductStatus, type Product } from '../../services/products'

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [flavorId, setFlavorId] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [listOpen, setListOpen] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getProducts(), getCategories(), getBrands(), getFlavors()])
      .then(([loadedProducts, loadedCategories, loadedBrands, loadedFlavors]) => {
        setProducts(loadedProducts)
        const activeCategories = loadedCategories.filter((category) => category.active)
        setCategories(activeCategories)
        setBrands(loadedBrands.filter((brand) => brand.active))
        setFlavors(loadedFlavors.filter((flavor) => flavor.active))
        setCategoryId(activeCategories[0]?.id ?? '')
        setBrandId(loadedBrands.find((brand) => brand.active)?.id ?? '')
      })
      .catch(() => setError('Não foi possível carregar produtos e categorias.'))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!categoryId || (!isRoshCategory && !name.trim()) || (isRoshCategory && !flavorId) || !price) return

    setIsSaving(true)
    setError('')
    try {
      const product = await createProduct({
        category_id: categoryId,
        flavor_id: isRoshCategory ? flavorId : undefined,
        name: isRoshCategory ? 'Rosh' : name.trim(),
        price: price.replace(',', '.'),
        description: description.trim() || undefined,
      })
      setProducts((current) => [...current, product])
      setName('')
      setPrice('')
      setDescription('')
      setFlavorId('')
    } catch {
      setError('Não foi possível criar o produto. Confira a categoria e o preço.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(product: Product) {
    setUpdatingId(product.id)
    setError('')
    try {
      const updatedProduct = await updateProductStatus(product.id, !product.active)
      setProducts((current) => current.map((item) => item.id === product.id ? updatedProduct : item))
    } catch {
      setError('Não foi possível atualizar o status do produto.')
    } finally {
      setUpdatingId(null)
    }
  }

  const inactiveCount = products.filter((product) => !product.active).length
  const visibleProducts = showAll ? products : products.filter((product) => product.active)
  const productsByCategory = useMemo(() => categories.map((category) => ({
    category,
    products: visibleProducts.filter((product) => product.category_id === category.id),
  })).filter((group) => group.products.length > 0), [categories, visibleProducts])
  const displayCategoryName = (category: Category) => category.name.toLowerCase() === 'essências' ? 'Rosh' : category.name
  const isRoshCategory = categories.find((category) => category.id === categoryId)?.name.toLowerCase() === 'rosh'
  const brandFlavors = flavors.filter((flavor) => flavor.brand_id === brandId)

  return (
    <section className="page-content simple-page products-page">
      <div className="page-heading"><div><span className="eyebrow">Catálogo conectado</span><h1>Produtos</h1><p>Cadastre vários itens dentro de cada categoria.</p></div></div>
      {error && <div className="api-error"><AlertCircle size={16} />{error}</div>}
      <form className="resource-form product-form" onSubmit={handleSubmit}>
        <label htmlFor="product-category">Novo produto</label>
        <div className="product-form-grid">
          <select id="product-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={categories.length === 0}>
            {categories.length === 0 ? <option value="">Nenhuma categoria ativa</option> : categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          {isRoshCategory ? <><select value={brandId} onChange={(event) => { setBrandId(event.target.value); setFlavorId('') }}><option value="">Selecione a marca</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select><select value={flavorId} onChange={(event) => setFlavorId(event.target.value)} disabled={!brandId}><option value="">Selecione o sabor</option>{brandFlavors.map((flavor) => <option key={flavor.id} value={flavor.id}>{flavor.name}</option>)}</select></> : <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Coca-Cola" maxLength={120} />}
          <input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Preço" inputMode="decimal" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição (opcional)" maxLength={500} />
          <button className="primary-button resource-submit" type="submit" disabled={isSaving || !categoryId || (!isRoshCategory && !name.trim()) || (isRoshCategory && !flavorId) || !price}>
            {isSaving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
            {isSaving ? 'Salvando...' : 'Adicionar produto'}
          </button>
        </div>
      </form>
      <div className="resource-list">
        <div className="resource-list-header">
          <div><strong>{showAll ? 'Todos os produtos' : 'Produtos ativos'}</strong><span>{visibleProducts.length} registros</span></div>
          <button className="resource-filter" type="button" onClick={() => setListOpen((current) => !current)}><ChevronDown size={14} />{listOpen ? 'Recolher' : 'Exibir'}</button>
          {listOpen && <button className="resource-filter" type="button" onClick={() => setShowAll((current) => !current)} disabled={!showAll && inactiveCount === 0}>
            {showAll ? <EyeOff size={14} /> : <Eye size={14} />}
            {showAll ? 'Ocultar inativos' : `Ver todos (${inactiveCount})`}
          </button>}
        </div>
        {listOpen && (isLoading ? <div className="resource-state"><LoaderCircle className="spin" size={20} />Carregando catálogo...</div> : productsByCategory.length === 0 ? <div className="resource-state">Nenhum produto cadastrado ainda.</div> : productsByCategory.map(({ category, products: categoryProducts }) => (
          <div className="product-category-group" key={category.id}>
            <div className="product-category-heading"><h3>{displayCategoryName(category)}</h3><span>{categoryProducts.length} {categoryProducts.length === 1 ? 'item' : 'itens'}</span></div>
            {categoryProducts.map((product) => <article className="resource-row" key={product.id}><div><strong>{product.name}</strong><span className={product.active ? '' : 'status-inactive'}>{product.description || (product.active ? 'Sem descrição' : 'Inativo')}</span></div><b className="product-price">R$ {Number(product.price).toFixed(2).replace('.', ',')}</b><button className={product.active ? 'icon-danger' : 'icon-success'} type="button" onClick={() => void handleStatusChange(product)} disabled={updatingId === product.id} aria-label={`${product.active ? 'Desativar' : 'Ativar'} ${product.name}`}>{updatingId === product.id ? <LoaderCircle className="spin" size={16} /> : product.active ? <CircleOff size={16} /> : <Check size={16} />}</button></article>)}
          </div>
        )))}
      </div>
    </section>
  )
}
