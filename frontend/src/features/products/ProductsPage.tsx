import { AlertCircle, LoaderCircle, Plus } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { getCategories, type Category } from '../../services/categories'
import { createProduct, getProducts, type Product } from '../../services/products'

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getProducts(), getCategories()])
      .then(([loadedProducts, loadedCategories]) => {
        setProducts(loadedProducts)
        const activeCategories = loadedCategories.filter((category) => category.active)
        setCategories(activeCategories)
        setCategoryId(activeCategories[0]?.id ?? '')
      })
      .catch(() => setError('Não foi possível carregar produtos e categorias.'))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!categoryId || !name.trim() || !price) return

    setIsSaving(true)
    setError('')
    try {
      const product = await createProduct({
        category_id: categoryId,
        name: name.trim(),
        price: price.replace(',', '.'),
        description: description.trim() || undefined,
      })
      setProducts((current) => [...current, product])
      setName('')
      setPrice('')
      setDescription('')
    } catch {
      setError('Não foi possível criar o produto. Confira a categoria e o preço.')
    } finally {
      setIsSaving(false)
    }
  }

  const productsByCategory = useMemo(() => categories.map((category) => ({
    category,
    products: products.filter((product) => product.category_id === category.id),
  })).filter((group) => group.products.length > 0), [categories, products])

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
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Coca-Cola" maxLength={120} />
          <input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Preço" inputMode="decimal" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição (opcional)" maxLength={500} />
          <button className="primary-button resource-submit" type="submit" disabled={isSaving || !categoryId || !name.trim() || !price}>
            {isSaving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
            {isSaving ? 'Salvando...' : 'Adicionar produto'}
          </button>
        </div>
      </form>
      <div className="resource-list">
        <div className="resource-list-header"><div><strong>Produtos por categoria</strong><span>{products.length} produtos ativos</span></div></div>
        {isLoading ? <div className="resource-state"><LoaderCircle className="spin" size={20} />Carregando catálogo...</div> : productsByCategory.length === 0 ? <div className="resource-state">Nenhum produto cadastrado ainda.</div> : productsByCategory.map(({ category, products: categoryProducts }) => (
          <div className="product-category-group" key={category.id}>
            <div className="product-category-heading"><h3>{category.name}</h3><span>{categoryProducts.length} {categoryProducts.length === 1 ? 'item' : 'itens'}</span></div>
            {categoryProducts.map((product) => <article className="resource-row" key={product.id}><div><strong>{product.name}</strong><span>{product.description || 'Sem descrição'}</span></div><b className="product-price">R$ {Number(product.price).toFixed(2).replace('.', ',')}</b></article>)}
          </div>
        ))}
      </div>
    </section>
  )
}
