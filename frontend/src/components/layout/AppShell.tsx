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
  X,
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { label: 'Visão geral', to: '/', icon: LayoutDashboard },
  { label: 'Pedidos', to: '/orders', icon: ClipboardList },
  { label: 'Produtos', to: '/products', icon: Package },
  { label: 'Sabores', to: '/flavors', icon: Coffee },
  { label: 'Marcas', to: '/brands', icon: Tags },
  { label: 'Categorias', to: '/categories', icon: Boxes },
  { label: 'Clientes', to: '/customers', icon: UsersRound },
]

export function AppShell() {
  const [open, setOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark">H</div>
          <div>
            <strong>Hookah</strong>
            <span>Driver · Gestão</span>
          </div>
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
          {navigation.slice(0, 2).map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /> {label}
            </NavLink>
          ))}
          <span className="nav-label">Catálogo</span>
          {navigation.slice(2, 6).map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /> {label}
            </NavLink>
          ))}
          <span className="nav-label">Relacionamento</span>
          {navigation.slice(6).map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip"><CircleUserRound size={22} /><div><strong>Administrador</strong><span>Conta principal</span></div></div>
        </div>
      </aside>
      {open && <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="Fechar menu" />}

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button menu-trigger" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Hookah Driver</span><b>/</b><strong>Gestão</strong></div>
          <div className="topbar-actions"><span className="status-dot"><i /> API online</span><button className="icon-button"><CircleUserRound size={21} /></button></div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
