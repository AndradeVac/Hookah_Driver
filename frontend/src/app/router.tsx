import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { LoginPage } from '../features/auth/LoginPage'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { PlaceholderPage } from '../features/shared/PlaceholderPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/brands" element={<PlaceholderPage title="Marcas" description="Organize as marcas disponíveis no catálogo." />} />
          <Route path="/categories" element={<PlaceholderPage title="Categorias" description="Estruture o cardápio por momentos e famílias de produto." />} />
          <Route path="/flavors" element={<PlaceholderPage title="Sabores" description="Gerencie sabores e suas marcas relacionadas." />} />
          <Route path="/products" element={<PlaceholderPage title="Produtos" description="Controle preços, disponibilidade e composição do catálogo." />} />
          <Route path="/customers" element={<PlaceholderPage title="Clientes" description="Acompanhe a base de clientes e seus pedidos." />} />
          <Route path="/orders" element={<PlaceholderPage title="Pedidos" description="Acompanhe o fluxo de atendimento em tempo real." />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
