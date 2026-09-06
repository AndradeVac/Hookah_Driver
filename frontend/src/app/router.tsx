import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { BrandsPage } from '../features/brands/BrandsPage'
import { CategoriesPage } from '../features/categories/CategoriesPage'
import { ProductsPage } from '../features/products/ProductsPage'
import { FlavorsPage } from '../features/flavors/FlavorsPage'
import { CustomersPage } from '../features/customers/CustomersPage'
import { UsersPage } from '../features/users/UsersPage'
import { LoginPage } from '../features/auth/LoginPage'
import { ProtectedRoute, RoleRoute } from '../features/auth/ProtectedRoute'
import { DashboardOverviewPage } from '../features/dashboard/DashboardOverviewPage'
import { OrderDetailPage } from '../features/orders/OrderDetailPage'
import { NewOrderPage } from '../features/orders/NewOrderPage'
import { OrdersPage } from '../features/orders/OrdersPage'
import { CustomerOrderPage } from '../features/customer/CustomerOrderPage'
import { CustomerQrScannerPage } from '../features/customer/CustomerQrScannerPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cliente" element={<CustomerOrderPage />} />
          <Route path="/cliente/scan" element={<CustomerQrScannerPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/orders" element={<OrdersPage />} />
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
            </Route>
          </Route>
        </Route>
            <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
