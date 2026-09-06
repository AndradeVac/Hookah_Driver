import { AlertCircle, Check, CircleOff, Eye, EyeOff, LoaderCircle, Plus } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { createCategory, getCategories, updateCategoryStatus, type Category } from '../../services/categories'

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setError('Não foi possível carregar as categorias.'))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    setIsSaving(true)
    setError('')
    try {
      const category = await createCategory(trimmedName)
      setCategories((current) => [category, ...current])
      setName('')
    } catch {
      setError('Não foi possível criar a categoria. Verifique se ela já existe.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(category: Category) {
    setUpdatingId(category.id)
    setError('')
    try {
      const updatedCategory = await updateCategoryStatus(category.id, !category.active)
      setCategories((current) => current.map((item) => item.id === category.id ? updatedCategory : item))
    } catch {
      setError('Não foi possível atualizar o status da categoria.')
    } finally {
      setUpdatingId(null)
    }
  }

  const inactiveCount = categories.filter((category) => !category.active).length
  const visibleCategories = showAll ? categories : categories.filter((category) => category.active)

  return (
    <section className="page-content simple-page">
      <div className="page-heading"><div><span className="eyebrow">Catálogo conectado</span><h1>Categorias</h1><p>Organize o catálogo por famílias de produtos.</p></div></div>
      {error && <div className="api-error"><AlertCircle size={16} />{error}</div>}
      <form className="resource-form" onSubmit={handleSubmit}>
        <label htmlFor="category-name">Nova categoria</label>
        <div className="resource-form-row">
          <input id="category-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Rosh" maxLength={100} />
          <button className="primary-button resource-submit" type="submit" disabled={isSaving || !name.trim()}>
            {isSaving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
            {isSaving ? 'Salvando...' : 'Adicionar categoria'}
          </button>
        </div>
      </form>
      <div className="resource-list">
        <div className="resource-list-header">
          <div><strong>{showAll ? 'Todas as categorias' : 'Categorias ativas'}</strong><span>{visibleCategories.length} registros</span></div>
          {inactiveCount > 0 && <button className="resource-filter" type="button" onClick={() => setShowAll((current) => !current)}>
            {showAll ? <EyeOff size={14} /> : <Eye size={14} />}
            {showAll ? 'Ocultar inativas' : `Ver todas (${inactiveCount})`}
          </button>}
        </div>
        {isLoading ? <div className="resource-state"><LoaderCircle className="spin" size={20} />Carregando catálogo...</div> : visibleCategories.length === 0 ? <div className="resource-state">Nenhuma categoria ativa cadastrada.</div> : visibleCategories.map((category) => (
          <article className="resource-row" key={category.id}>
            <div><strong>{category.name}</strong><span className={category.active ? 'status-active' : 'status-inactive'}>{category.active ? 'Ativa' : 'Inativa'}</span></div>
            <button className={category.active ? 'icon-danger' : 'icon-success'} type="button" onClick={() => void handleStatusChange(category)} disabled={updatingId === category.id} aria-label={`${category.active ? 'Desativar' : 'Ativar'} ${category.name}`}>
              {updatingId === category.id ? <LoaderCircle className="spin" size={16} /> : category.active ? <CircleOff size={16} /> : <Check size={16} />}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
