import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { store } from './store/index.js'
import { ToastProvider } from './components/global/index.jsx'
import { initAdminAuth } from './store/slices/authSlice.js'
// api.js imported via authSlice
import AdminLayout from './layout/AdminLayout.jsx'
import { Wrench } from 'lucide-react'

// Auth
const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'))

// Dashboard
const AdminDashboardPage = lazy(() => import('./pages/dashboard/AdminDashboardPage.jsx'))

// Restaurants
const PendingRestaurantsPage = lazy(() => import('./pages/restaurants/PendingRestaurantsPage.jsx'))
const RestaurantsPage        = lazy(() => import('./pages/restaurants/RestaurantsPage.jsx'))
const RestaurantDetailPage   = lazy(() => import('./pages/restaurants/RestaurantDetailPage.jsx'))
const AddRestaurantPage      = lazy(() => import('./pages/restaurants/AddRestaurantPage.jsx'))
const SalesReportPage        = lazy(() => import('./pages/restaurants/SalesReportPage.jsx'))

// Drivers
const PendingDriversPage  = lazy(() => import('./pages/drivers/PendingDriversPage.jsx'))
const DriversPage         = lazy(() => import('./pages/drivers/DriversPages.jsx').then(m => ({ default: m.DriversPage })))
const DriverDetailPage    = lazy(() => import('./pages/drivers/DriversPages.jsx').then(m => ({ default: m.DriverDetailPage })))

// Orders
const OrdersPage          = lazy(() => import('./pages/orders/OrdersPage.jsx'))
const OrderDetailPage     = lazy(() => import('./pages/orders/OrderDetailPage.jsx'))

// Customers
const CustomersPage       = lazy(() => import('./pages/customers/CustomersPages.jsx').then(m => ({ default: m.CustomersPage })))
const CustomerDetailPage  = lazy(() => import('./pages/customers/CustomersPages.jsx').then(m => ({ default: m.CustomerDetailPage })))

// Delivery
const DeliveryPricingPage = lazy(() => import('./pages/delivery/DeliveryPricingPage.jsx'))

// Platform Pricing & Commission
const PlatformPricingPage = lazy(() => import('./pages/pricing/PlatformPricingPage.jsx'))

// Marketing
const MarketingPage         = lazy(() => import('./pages/marketing/MarketingPages.jsx').then(m => ({ default: m.MarketingPage })))

// Wallet & Referrals
const WalletReferralsPage   = lazy(() => import('./pages/wallet/WalletReferralsPage.jsx'))

// Finance / Payments
const PaymentsOverviewPage  = lazy(() => import('./pages/payments/PaymentsOverviewPage.jsx'))
const PayoutManagementPage  = lazy(() => import('./pages/payments/PayoutsPages.jsx').then(m => ({ default: m.PayoutManagementPage })))
const FailedPaymentsList    = lazy(() => import('./pages/payments/PayoutsPages.jsx').then(m => ({ default: m.FailedPaymentsList })))

// Complaints
const AdminComplaintsPage      = lazy(() => import('./pages/complaints/ComplaintsPages.jsx').then(m => ({ default: m.AdminComplaintsPage })))
const AdminComplaintDetailPage = lazy(() => import('./pages/complaints/ComplaintsPages.jsx').then(m => ({ default: m.AdminComplaintDetailPage })))

// Gift Cards
const AdminGiftCardsPage = lazy(() => import('./pages/giftcards/GiftCardsPages.jsx'))
const CreateBatchPage    = lazy(() => import('./pages/giftcards/GiftCardsPages.jsx').then(m => ({ default: m.CreateBatchPage })))

// Subscriptions
const AdminSubscriptionsPage = lazy(() => import('./pages/subscriptions/SubscriptionsPages.jsx'))
const PlanEditorPage         = lazy(() => import('./pages/subscriptions/SubscriptionsPages.jsx').then(m => ({ default: m.PlanEditorPage })))

// CMS
const CmsPage = lazy(() => import('./pages/cms/CmsPages.jsx').then(m => ({ default: m.CmsPage })))

// Catalog
const CatalogPage = lazy(() => import('./pages/catalog/CatalogPage.jsx').then(m => ({ default: m.CatalogPage })))

// Admin Users & Roles
const AdminUsersPage = lazy(() => import('./pages/admin-users/AdminUsersPage.jsx').then(m => ({ default: m.AdminUsersPage })))

// Tools & Logs
const ToolsPage = lazy(() => import('./pages/tools/ToolsPages.jsx').then(m => ({ default: m.ToolsPage })))

// P9 — Student Verification & Driver Store
const StudentVerificationPage = lazy(() => import('./pages/student-verification/StudentVerificationPages.jsx'))
const DriverStorePage         = lazy(() => import('./pages/driver-store/DriverStorePages.jsx'))
const ProductFormPage         = lazy(() => import('./pages/driver-store/DriverStorePages.jsx').then(m => ({ default: m.ProductFormPage })))

const SettingsPage = lazy(() => import('./pages/settings/SettingsPage.jsx'))

function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center p-6">
      <div className="w-14 h-14 rounded-2xl bg-bg-section flex items-center justify-center mb-4">
        <Wrench size={28} className="text-text-muted" />
      </div>
      <h2 className="text-xl font-bold text-text-primary">{title}</h2>
      <p className="text-sm text-text-muted mt-1">Being built in a future phase.</p>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing } = useSelector(s => s.auth)
  const location = useLocation()
  if (isInitializing) return <div className="min-h-screen flex items-center justify-center"><span className="spinner spinner-lg" /></div>
  if (!isAuthenticated) return <Navigate to="/auth/login" state={{ from: location }} replace />
  return children
}

function SessionRestore({ children }) {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(initAdminAuth())
  }, [dispatch])
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <AdminLayout>
            <Routes>
              {/* ── Dashboard ── */}
              <Route path="/dashboard" element={<AdminDashboardPage />} />

              {/* ── Restaurants ── */}
              <Route path="/restaurants/new-requests" element={<PendingRestaurantsPage />} />
              <Route path="/restaurants/list"         element={<RestaurantsPage />} />
              <Route path="/restaurants/add"          element={<AddRestaurantPage />} />
              <Route path="/restaurants/sales-report" element={<SalesReportPage />} />
              <Route path="/restaurants/:id"          element={<RestaurantDetailPage />} />
              <Route path="/restaurants/*"            element={<Navigate to="/restaurants/list" replace />} />

              {/* ── Drivers ── */}
              <Route path="/drivers/pending"  element={<PendingDriversPage />} />
              <Route path="/drivers"          element={<DriversPage />} />
              <Route path="/drivers/:id"      element={<DriverDetailPage />} />

              {/* ── Orders ── */}
              <Route path="/orders"           element={<OrdersPage />} />
              <Route path="/orders/:id"       element={<OrderDetailPage />} />

              {/* ── Customers ── */}
              <Route path="/customers"        element={<CustomersPage />} />
              <Route path="/customers/:id"    element={<CustomerDetailPage />} />

              {/* ── Delivery & Pricing ── */}
              <Route path="/delivery"         element={<DeliveryPricingPage />} />
              <Route path="/pricing"          element={<PlatformPricingPage />} />

              {/* ── Marketing & Promotions ── */}
              <Route path="/marketing"        element={<MarketingPage />} />
              <Route path="/promos"           element={<MarketingPage />} />

              {/* ── Wallet / Referrals ── */}
              <Route path="/wallet"           element={<WalletReferralsPage />} />
              <Route path="/wallet/*"         element={<WalletReferralsPage />} />

              {/* ── Gift Cards ── */}
              <Route path="/gift-cards"       element={<AdminGiftCardsPage />} />
              <Route path="/gift-cards/batch" element={<CreateBatchPage />} />

              {/* ── Complaints & Refunds ── */}
              <Route path="/complaints"       element={<AdminComplaintsPage />} />
              <Route path="/complaints/:id"   element={<AdminComplaintDetailPage />} />

              {/* ── Finance & Payouts ── */}
              <Route path="/finance/overview" element={<PaymentsOverviewPage />} />
              <Route path="/finance/payouts"  element={<PayoutManagementPage />} />
              <Route path="/finance/failed"   element={<FailedPaymentsList />} />
              <Route path="/finance/*"        element={<Navigate to="/finance/overview" replace />} />

              {/* ── CMS & Content ── */}
              <Route path="/cms"              element={<CmsPage />} />
              <Route path="/cms/*"            element={<CmsPage />} />

              {/* ── Catalog & Verticals ── */}
              <Route path="/catalog"          element={<CatalogPage />} />

              {/* ── Subscriptions ── */}
              <Route path="/subscriptions"             element={<AdminSubscriptionsPage />} />
              <Route path="/subscriptions/plans/new"   element={<PlanEditorPage />} />
              <Route path="/subscriptions/plans/:id"   element={<PlanEditorPage />} />

              {/* ── Student Verification ── */}
              <Route path="/student-verification/*" element={<StudentVerificationPage />} />

              {/* ── Driver Store ── */}
              <Route path="/driver-store"           element={<DriverStorePage />} />
              <Route path="/driver-store/new"       element={<ProductFormPage />} />
              <Route path="/driver-store/:id/edit"  element={<ProductFormPage />} />

              {/* ── Driver Store ── */}

              {/* ── Settings ── */}
              <Route path="/settings"           element={<SettingsPage />} />
              <Route path="/settings/:tab"       element={<SettingsPage />} />

              {/* ── Admin Users & Roles ── */}
              <Route path="/admin-users"     element={<AdminUsersPage />} />

              {/* ── Tools & Logs ── */}
              <Route path="/tools"           element={<ToolsPage />} />

              <Route path="*"               element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AdminLayout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span className="spinner spinner-lg" /></div>}>
            <SessionRestore><AppRoutes /></SessionRestore>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </Provider>
  )
}
