import { AlertCircle, Check, CircleOff, Eye, EyeOff, LoaderCircle, Plus } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { createUser, getUsers, updateUserStatus, type AppUser } from '../../services/users'

export function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR')
  const [showAll, setShowAll] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { getUsers().then(setUsers).catch(() => setError('Não foi possível carregar a equipe.')).finally(() => setIsLoading(false)) }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    try {
      const user = await createUser({ name: name.trim(), email: email.trim(), password, role })
      setUsers((current) => [...current, user])
      setName(''); setEmail(''); setPassword('')
    } catch { setError('Não foi possível criar o usuário. Verifique o e-mail e a senha.') } finally { setIsSaving(false) }
  }

  async function toggleStatus(user: AppUser) {
    setUpdatingId(user.id); setError('')
    try { const updated = await updateUserStatus(user.id, !user.active); setUsers((current) => current.map((item) => item.id === user.id ? updated : item)) } catch { setError('Não foi possível atualizar o usuário.') } finally { setUpdatingId(null) }
  }

  const inactiveCount = users.filter((user) => !user.active).length
  const visibleUsers = showAll ? users : users.filter((user) => user.active)

  return <section className="page-content simple-page"><div className="page-heading"><div><span className="eyebrow">Acesso administrativo</span><h1>Equipe</h1><p>Gerencie quem pode operar o Hookah Driver.</p></div></div>{error && <div className="api-error"><AlertCircle size={16} />{error}</div>}<form className="resource-form product-form" onSubmit={handleSubmit}><label htmlFor="user-name">Novo usuário</label><div className="product-form-grid user-form-grid"><input id="user-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" required /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail" required /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha (mín. 8)" minLength={8} required /><select value={role} onChange={(event) => setRole(event.target.value as typeof role)}><option value="OPERATOR">Operador</option><option value="ADMIN">Administrador</option></select><button className="primary-button resource-submit" type="submit" disabled={isSaving}>{isSaving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}{isSaving ? 'Salvando...' : 'Adicionar usuário'}</button></div></form><div className="resource-list"><div className="resource-list-header"><div><strong>{showAll ? 'Todos os usuários' : 'Usuários ativos'}</strong><span>{visibleUsers.length} registros</span></div><button className="resource-filter" type="button" onClick={() => setShowAll((current) => !current)} disabled={!showAll && inactiveCount === 0}>{showAll ? <EyeOff size={14} /> : <Eye size={14} />}{showAll ? 'Ocultar inativos' : `Ver todos (${inactiveCount})`}</button></div>{isLoading ? <div className="resource-state"><LoaderCircle className="spin" size={20} />Carregando equipe...</div> : visibleUsers.map((user) => <article className="resource-row" key={user.id}><div><strong>{user.name}</strong><span className={user.active ? 'status-active' : 'status-inactive'}>{user.email} · {user.role === 'ADMIN' ? 'Administrador' : 'Operador'} · {user.active ? 'Ativo' : 'Inativo'}</span></div><button className={user.active ? 'icon-danger' : 'icon-success'} type="button" onClick={() => void toggleStatus(user)} disabled={updatingId === user.id} aria-label={`${user.active ? 'Desativar' : 'Ativar'} ${user.name}`}>{updatingId === user.id ? <LoaderCircle className="spin" size={16} /> : user.active ? <CircleOff size={16} /> : <Check size={16} />}</button></article>)}</div></section>
}