import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { LoginPage } from '../features/auth/LoginPage'
import { ProtectedRoute, RoleRoute } from '../features/auth/ProtectedRoute'

const BrandsPage = lazy(() => import('../features/brands/BrandsPage').then((module) => ({ default: module.BrandsPage })))
const CategoriesPage = lazy(() => import('../features/categories/CategoriesPage').then((module) => ({ default: module.CategoriesPage })))
const ProductsPage = lazy(() => import('../features/products/ProductsPage').then((module) => ({ default: module.ProductsPage })))
const FlavorsPage = lazy(() => import('../features/flavors/FlavorsPage').then((module) => ({ default: module.FlavorsPage })))
const CustomersPage = lazy(() => import('../features/customers/CustomersPage').then((module) => ({ default: module.CustomersPage })))
const UsersPage = lazy(() => import('../features/users/UsersPage').then((module) => ({ default: module.UsersPage })))
const AuditPage = lazy(() => import('../features/audit/AuditPage').then((module) => ({ default: module.AuditPage })))
const DashboardOverviewPage = lazy(() => import('../features/dashboard/DashboardOverviewPage').then((module) => ({ default: module.DashboardOverviewPage })))
const OrderDetailPage = lazy(() => import('../features/orders/OrderDetailPage').then((module) => ({ default: module.OrderDetailPage })))
const NewOrderPage = lazy(() => import('../features/orders/NewOrderPage').then((module) => ({ default: module.NewOrderPage })))
const OrdersPage = lazy(() => import('../features/orders/OrdersPage').then((module) => ({ default: module.OrdersPage })))
const CustomerQrScannerPage = lazy(() => import('../features/customer/CustomerQrScannerPage').then((module) => ({ default: module.CustomerQrScannerPage })))
const CustomerJourneyPage = lazy(() => import('../features/customer/CustomerJourneyPage').then((module) => ({ default: module.CustomerJourneyPage })))
const OrdersTrackingPage = lazy(() => import('../features/lounge/OrdersTrackingPage').then((module) => ({ default: module.OrdersTrackingPage })))

function RouteLoading() {
  return <div className="auth-loading"><div className="loading-mark">H</div><span>Carregando seu espaço...</span></div>
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cliente" element={<CustomerJourneyPage />} />
          <Route path="/cliente/scan" element={<CustomerQrScannerPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/tracking" element={<OrdersTrackingPage />} />
            <Route path="/orders/new" element={<NewOrderPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route element={<RoleRoute roles={['ADMIN']} />}>
              <Route path="/" element={<DashboardOverviewPage />} />
              <Route path="/dashboard" element={<DashboardOverviewPage />} />
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
