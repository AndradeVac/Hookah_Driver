import { AlertCircle, Check, CircleOff, LoaderCircle, Plus } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { createBrand, getBrands, updateBrandStatus, type Brand } from '../../services/brands'

export function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function loadBrands() {
    setError('')
    try {
      setBrands(await getBrands())
    } catch {
      setError('Não foi possível carregar as marcas.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadBrands()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    setIsSaving(true)
    setError('')
    try {
      const brand = await createBrand(trimmedName)
      setBrands((current) => [brand, ...current])
      setName('')
    } catch {
      setError('Não foi possível criar a marca. Verifique se ela já existe.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(brand: Brand) {
    setUpdatingId(brand.id)
    setError('')
    try {
      const updatedBrand = await updateBrandStatus(brand.id, !brand.active)
      setBrands((current) => current.map((item) => item.id === brand.id ? updatedBrand : item))
    } catch {
      setError('Não foi possível atualizar o status da marca.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section className="page-content simple-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Catálogo conectado</span>
          <h1>Marcas</h1>
          <p>Gerencie as marcas disponíveis no catálogo.</p>
        </div>
      </div>

      {error && <div className="api-error"><AlertCircle size={16} />{error}</div>}

      <form className="resource-form" onSubmit={handleSubmit}>
        <label htmlFor="brand-name">Nova marca</label>
        <div className="resource-form-row">
          <input id="brand-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: ZIGGY" maxLength={100} />
          <button className="primary-button resource-submit" type="submit" disabled={isSaving || !name.trim()}>
            {isSaving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
            {isSaving ? 'Salvando...' : 'Adicionar marca'}
          </button>
        </div>
      </form>

      <div className="resource-list">
        <div className="resource-list-header"><strong>Marcas cadastradas</strong><span>{brands.length} registros</span></div>
        {isLoading ? (
          <div className="resource-state"><LoaderCircle className="spin" size={20} />Carregando catálogo...</div>
        ) : brands.length === 0 ? (
          <div className="resource-state">Nenhuma marca cadastrada ainda.</div>
        ) : (
          brands.map((brand) => (
            <article className="resource-row" key={brand.id}>
              <div><strong>{brand.name}</strong><span className={brand.active ? 'status-active' : 'status-inactive'}>{brand.active ? 'Ativa' : 'Inativa'}</span></div>
              <button className={brand.active ? 'icon-danger' : 'icon-success'} type="button" onClick={() => void handleStatusChange(brand)} disabled={updatingId === brand.id} aria-label={`${brand.active ? 'Desativar' : 'Ativar'} ${brand.name}`}>
                {updatingId === brand.id ? <LoaderCircle className="spin" size={16} /> : brand.active ? <CircleOff size={16} /> : <Check size={16} />}
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
