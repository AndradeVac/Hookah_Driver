import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { BrandsPage } from '../features/brands/BrandsPage'
import { LoginPage } from '../features/auth/LoginPage'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { DashboardOverviewPage } from '../features/dashboard/DashboardOverviewPage'
import { OrderDetailPage } from '../features/orders/OrderDetailPage'
import { OrdersPage } from '../features/orders/OrdersPage'
import { PlaceholderPage } from '../features/shared/PlaceholderPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardOverviewPage />} />
            <Route path="/dashboard" element={<DashboardOverviewPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/brands" element={<BrandsPage />} />
            <Route path="/categories" element={<PlaceholderPage title="Categorias" description="Estruture o cardápio por momentos e famílias de produto." />} />
            <Route path="/flavors" element={<PlaceholderPage title="Sabores" description="Gerencie sabores e suas marcas relacionadas." />} />
            <Route path="/products" element={<PlaceholderPage title="Produtos" description="Controle preços, disponibilidade e composição do catálogo." />} />
            <Route path="/customers" element={<PlaceholderPage title="Clientes" description="Acompanhe a base de clientes e seus pedidos." />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
