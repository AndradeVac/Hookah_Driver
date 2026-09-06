import { AlertCircle, Check, CircleOff, Eye, EyeOff, LoaderCircle, Plus } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { getBrands, type Brand } from '../../services/brands'
import { createFlavor, getFlavors, updateFlavorStatus, type Flavor } from '../../services/flavors'

export function FlavorsPage() {
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [brandId, setBrandId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getFlavors(), getBrands()])
      .then(([loadedFlavors, loadedBrands]) => {
        setFlavors(loadedFlavors)
        const activeBrands = loadedBrands.filter((brand) => brand.active)
        setBrands(activeBrands)
        setBrandId(activeBrands[0]?.id ?? '')
      })
      .catch(() => setError('Não foi possível carregar sabores e marcas.'))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!brandId || !name.trim()) return

    setIsSaving(true)
    setError('')
    try {
      const flavor = await createFlavor({ brand_id: brandId, name: name.trim(), description: description.trim() || undefined })
      setFlavors((current) => [...current, flavor])
      setName('')
      setDescription('')
    } catch {
      setError('Não foi possível criar o sabor. Verifique se ele já existe nessa marca.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(flavor: Flavor) {
    setUpdatingId(flavor.id)
    setError('')
    try {
      const updatedFlavor = await updateFlavorStatus(flavor.id, !flavor.active)
      setFlavors((current) => current.map((item) => item.id === flavor.id ? updatedFlavor : item))
    } catch {
      setError('Não foi possível atualizar o status do sabor.')
    } finally {
      setUpdatingId(null)
    }
  }

  const activeBrandIds = new Set(brands.map((brand) => brand.id))
  const inactiveCount = flavors.filter((flavor) => !flavor.active && activeBrandIds.has(flavor.brand_id)).length
  const visibleFlavors = showAll ? flavors : flavors.filter((flavor) => flavor.active)
  const flavorGroups = useMemo(() => brands.map((brand) => ({ brand, flavors: visibleFlavors.filter((flavor) => flavor.brand_id === brand.id) })).filter((group) => group.flavors.length > 0), [brands, visibleFlavors])

  return (
    <section className="page-content simple-page products-page">
      <div className="page-heading"><div><span className="eyebrow">Catálogo conectado</span><h1>Sabores</h1><p>Organize os sabores disponíveis por marca.</p></div></div>
      {error && <div className="api-error"><AlertCircle size={16} />{error}</div>}
      <form className="resource-form product-form" onSubmit={handleSubmit}>
        <label htmlFor="flavor-brand">Novo sabor</label>
        <div className="product-form-grid flavor-form-grid">
          <select id="flavor-brand" value={brandId} onChange={(event) => setBrandId(event.target.value)} disabled={brands.length === 0}>
            {brands.length === 0 ? <option value="">Nenhuma marca ativa</option> : brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Banana" maxLength={120} />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição (opcional)" maxLength={500} />
          <button className="primary-button resource-submit" type="submit" disabled={isSaving || !brandId || !name.trim()}>
            {isSaving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
            {isSaving ? 'Salvando...' : 'Adicionar sabor'}
          </button>
        </div>
      </form>
      <div className="resource-list">
        <div className="resource-list-header">
          <div><strong>{showAll ? 'Todos os sabores' : 'Sabores ativos'}</strong><span>{visibleFlavors.filter((flavor) => activeBrandIds.has(flavor.brand_id)).length} registros</span></div>
          {inactiveCount > 0 && <button className="resource-filter" type="button" onClick={() => setShowAll((current) => !current)}>
            {showAll ? <EyeOff size={14} /> : <Eye size={14} />}
            {showAll ? 'Ocultar inativos' : `Ver todos (${inactiveCount})`}
          </button>}
        </div>
        {isLoading ? <div className="resource-state"><LoaderCircle className="spin" size={20} />Carregando catálogo...</div> : flavorGroups.length === 0 ? <div className="resource-state">Nenhum sabor cadastrado ainda.</div> : flavorGroups.map(({ brand, flavors: brandFlavors }) => (
          <div className="product-category-group" key={brand.id}>
            <div className="product-category-heading"><h3>{brand.name}</h3><span>{brandFlavors.length} {brandFlavors.length === 1 ? 'sabor' : 'sabores'}</span></div>
            {brandFlavors.map((flavor) => <article className="resource-row" key={flavor.id}><div><strong>{flavor.name}</strong><span className={flavor.active ? 'status-active' : 'status-inactive'}>{flavor.active ? (flavor.description || 'Ativo') : 'Inativo'}</span></div><button className={flavor.active ? 'icon-danger' : 'icon-success'} type="button" onClick={() => void handleStatusChange(flavor)} disabled={updatingId === flavor.id} aria-label={`${flavor.active ? 'Desativar' : 'Ativar'} ${flavor.name}`} >{updatingId === flavor.id ? <LoaderCircle className="spin" size={16} /> : flavor.active ? <CircleOff size={16} /> : <Check size={16} />}</button></article>)}
          </div>
        ))}
      </div>
    </section>
  )
}