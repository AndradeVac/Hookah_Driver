import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { LoadingScreen, ProtectedRoute, RoleRoute } from '../features/auth/ProtectedRoute'

// Pages are split into separate chunks so the customer menu stays light.
function page<T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) {
  return lazy(() => load().then((module) => ({ default: module[name] as ComponentType })))
}

const LoginPage = page(() => import('../features/auth/LoginPage'), 'LoginPage')
const DashboardOverviewPage = page(() => import('../features/dashboard/DashboardOverviewPage'), 'DashboardOverviewPage')
const OrdersPage = page(() => import('../features/orders/OrdersPage'), 'OrdersPage')
const NewOrderPage = page(() => import('../features/orders/NewOrderPage'), 'NewOrderPage')
const OrderDetailPage = page(() => import('../features/orders/OrderDetailPage'), 'OrderDetailPage')
const CustomersPage = page(() => import('../features/customers/CustomersPage'), 'CustomersPage')
const BrandsPage = page(() => import('../features/brands/BrandsPage'), 'BrandsPage')
const CategoriesPage = page(() => import('../features/categories/CategoriesPage'), 'CategoriesPage')
const FlavorsPage = page(() => import('../features/flavors/FlavorsPage'), 'FlavorsPage')
const ProductsPage = page(() => import('../features/products/ProductsPage'), 'ProductsPage')
const UsersPage = page(() => import('../features/users/UsersPage'), 'UsersPage')
const AuditPage = page(() => import('../features/audit/AuditPage'), 'AuditPage')
const CustomerJourneyPage = page(() => import('../features/customer/CustomerJourneyPage'), 'CustomerJourneyPage')
const PublicOrderBoardPage = page(() => import('../features/customer/PublicOrderBoardPage'), 'PublicOrderBoardPage')
const CreditsPage = page(() => import('../features/customer/CreditsPage'), 'CreditsPage')
const CustomerQrScannerPage = page(() => import('../features/customer/CustomerQrScannerPage'), 'CustomerQrScannerPage')

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cliente" element={<CustomerJourneyPage />} />
          <Route path="/pedidos" element={<PublicOrderBoardPage />} />
          <Route path="/cliente/scan" element={<CustomerQrScannerPage />} />
          <Route path="/creditos" element={<CreditsPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/new" element={<NewOrderPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route element={<RoleRoute roles={['ADMIN']} />}>
                <Route path="/" element={<DashboardOverviewPage />} />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route path="/brands" element={<BrandsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/flavors" element={<FlavorsPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/audit" element={<AuditPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/orders" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
