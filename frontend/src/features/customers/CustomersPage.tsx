import { AlertCircle, Check, CircleOff, Eye, EyeOff, LoaderCircle, Plus, Search } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createCustomer, getCustomers, updateCustomerStatus, type Customer } from '../../services/customers'

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getCustomers().then(setCustomers).catch(() => setError('Não foi possível carregar os clientes.')).finally(() => setIsLoading(false))
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return
    setIsSaving(true)
    setError('')
    try {
      const customer = await createCustomer({ name: name.trim(), phone: phone.trim() || undefined })
      setCustomers((current) => [customer, ...current])
      setName('')
      setPhone('')
    } catch {
      setError('Não foi possível cadastrar o cliente.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(customer: Customer) {
    setUpdatingId(customer.id)
    setError('')
    try {
      const updatedCustomer = await updateCustomerStatus(customer.id, !customer.active)
      setCustomers((current) => current.map((item) => item.id === customer.id ? updatedCustomer : item))
    } catch {
      setError('Não foi possível atualizar o status do cliente.')
    } finally {
      setUpdatingId(null)
    }
  }

  const inactiveCount = customers.filter((customer) => !customer.active).length
  const visibleCustomers = useMemo(() => customers.filter((customer) => {
    const matchesSearch = `${customer.name} ${customer.phone ?? ''}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (showAll || customer.active)
  }), [customers, search, showAll])

  return (
    <section className="page-content simple-page">
      <div className="page-heading"><div><span className="eyebrow">Relacionamento conectado</span><h1>Clientes</h1><p>Acompanhe sua base de clientes e contatos.</p></div></div>
      {error && <div className="api-error"><AlertCircle size={16} />{error}</div>}
      <form className="resource-form product-form" onSubmit={handleSubmit}>
        <label htmlFor="customer-name">Novo cliente</label>
        <div className="product-form-grid customer-form-grid">
          <input id="customer-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome completo" maxLength={150} />
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Telefone (opcional)" maxLength={30} />
          <button className="primary-button resource-submit" type="submit" disabled={isSaving || !name.trim()}>
            {isSaving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
            {isSaving ? 'Salvando...' : 'Adicionar cliente'}
          </button>
        </div>
      </form>
      <div className="resource-list customers-list">
        <div className="resource-list-header">
          <div><strong>{showAll ? 'Todos os clientes' : 'Clientes ativos'}</strong><span>{visibleCustomers.length} registros</span></div>
          {inactiveCount > 0 && <button className="resource-filter" type="button" onClick={() => setShowAll((current) => !current)}>{showAll ? <EyeOff size={14} /> : <Eye size={14} />}{showAll ? 'Ocultar inativos' : `Ver todos (${inactiveCount})`}</button>}
        </div>
        <label className="resource-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou telefone" /></label>
        {isLoading ? <div className="resource-state"><LoaderCircle className="spin" size={20} />Carregando clientes...</div> : visibleCustomers.length === 0 ? <div className="resource-state">Nenhum cliente encontrado.</div> : visibleCustomers.map((customer) => (
          <article className="resource-row customer-row" key={customer.id}>
            <div><strong>{customer.name}</strong><span className={customer.active ? 'status-active' : 'status-inactive'}>{customer.phone || 'Sem telefone'} · {customer.active ? 'Ativo' : 'Inativo'}</span></div>
            <button className={customer.active ? 'icon-danger' : 'icon-success'} type="button" onClick={() => void handleStatusChange(customer)} disabled={updatingId === customer.id} aria-label={`${customer.active ? 'Desativar' : 'Ativar'} ${customer.name}`}>{updatingId === customer.id ? <LoaderCircle className="spin" size={16} /> : customer.active ? <CircleOff size={16} /> : <Check size={16} />}</button>
          </article>
        ))}
      </div>
    </section>
  )
}