import { NavLink, Outlet } from 'react-router-dom'
import {
  Boxes,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  Coffee,
  LayoutDashboard,
  Menu,
  Package,
  Tags,
  UsersRound,
  UserCog,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../features/auth/AuthProvider'

const navigation = [
  { label: 'Visão geral', to: '/', icon: LayoutDashboard },
  { label: 'Pedidos', to: '/orders', icon: ClipboardList },
  { label: 'Produtos', to: '/products', icon: Package },
  { label: 'Sabores', to: '/flavors', icon: Coffee },
  { label: 'Marcas', to: '/brands', icon: Tags },
  { label: 'Categorias', to: '/categories', icon: Boxes },
  { label: 'Clientes', to: '/customers', icon: UsersRound },
  { label: 'Equipe', to: '/users', icon: UserCog },
  { label: 'Auditoria', to: '/audit', icon: ShieldCheck },
]

export function AppShell() {
  const [open, setOpen] = useState(false)
  const [sections, setSections] = useState({ catalog: true, relationship: true, administration: true })
  const { user, logout } = useAuth()

  function toggleSection(section: keyof typeof sections) {
    setSections((current) => ({ ...current, [section]: !current[section] }))
  }

  return (
    <div className="app-shell app-shell-dark">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <img className="brand-logo" src="/images/logo.jpeg" alt="Hookah Drive" />
          <button className="icon-button mobile-close" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">L</div>
          <div><span>Espaço atual</span><strong>Lounge Hookah</strong></div>
          <ChevronDown size={16} />
        </div>

        <nav className="main-nav" aria-label="Navegação principal">
          <span className="nav-label">Operação</span>
          {navigation.slice(user?.role === 'ADMIN' ? 0 : 1, 2).map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /> {label}
            </NavLink>
          ))}
          {user?.role === 'ADMIN' && <><button className="nav-section-toggle" type="button" onClick={() => toggleSection('catalog')}><span className="nav-label">Catálogo</span><ChevronDown size={14} className={sections.catalog ? 'section-chevron-open' : ''} /></button>{sections.catalog && navigation.slice(2, 6).map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)}><Icon size={18} strokeWidth={1.8} /> {label}</NavLink>)}</>}
          <button className="nav-section-toggle" type="button" onClick={() => toggleSection('relationship')}><span className="nav-label">Relacionamento</span><ChevronDown size={14} className={sections.relationship ? 'section-chevron-open' : ''} /></button>
          {sections.relationship && navigation.slice(6, 7).map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)}><Icon size={18} strokeWidth={1.8} /> {label}</NavLink>)}
          {user?.role === 'ADMIN' && <><button className="nav-section-toggle" type="button" onClick={() => toggleSection('administration')}><span className="nav-label">Administração</span><ChevronDown size={14} className={sections.administration ? 'section-chevron-open' : ''} /></button>{sections.administration && navigation.slice(7).map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)}><Icon size={18} strokeWidth={1.8} /> {label}</NavLink>)}</>}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <CircleUserRound size={22} />
            <div>
              <strong>{user?.name ?? 'Usuário'}</strong>
              <span>{user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}</span>
            </div>
            <button className="logout-button" onClick={logout}>Sair</button>
          </div>
        </div>
      </aside>

      {open && <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="Fechar menu" />}

      <main className="main-content main-content-dark">
        <header className="topbar topbar-dark">
          <button className="icon-button menu-trigger" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu size={18} />
          </button>
          <div className="breadcrumb">
            <span>Admin</span>
            <b>—</b>
            <strong>Dashboard</strong>
          </div>
          <div className="topbar-actions">
            <span className="status-dot"><i /> API online</span>
            <button className="icon-button"><CircleUserRound size={20} /></button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
