import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { store } from './store/index.js'
import { ToastProvider } from './components/global/index.jsx'
import { initRestaurantAuth } from './store/slices/authSlice.js'
import RestaurantLayout from './layout/RestaurantLayout.jsx'
import { Wrench } from 'lucide-react'

const LoginPage              = lazy(() => import('./pages/auth/LoginPage.jsx'))
const RegisterPage           = lazy(() => import('./pages/register/RegisterPage.jsx'))
const PendingApprovalPage    = lazy(() => import('./pages/auth/PendingApprovalPage.jsx'))
const DocumentReuploadPage   = lazy(() => import('./pages/auth/DocumentReuploadPage.jsx'))

// Settings
const ProfileSettingsPage   = lazy(() => import('./pages/settings/ProfileSettingsPage.jsx'))
const HoursSettingsPage     = lazy(() => import('./pages/settings/HoursSettingsPage.jsx'))
const NotifSettingsPage     = lazy(() => import('./pages/settings/NotifSettingsPage.jsx'))

// Menu
const MenuPage              = lazy(() => import('./pages/menu/MenuPage.jsx'))
const ItemFormPage          = lazy(() => import('./pages/menu/ItemFormPage.jsx'))

// Delivery
const DeliverySettingsPage  = lazy(() => import('./pages/delivery/DeliverySettingsPage.jsx'))

// Orders
const LiveOrdersPage        = lazy(() => import('./pages/orders/LiveOrdersPage.jsx'))
const KitchenDisplayPage    = lazy(() => import('./pages/orders/KitchenDisplayPage.jsx'))
const OrderHistoryPage      = lazy(() => import('./pages/orders/OrderHistoryPage.jsx'))

// Complaints
const RestaurantComplaintsPage      = lazy(() => import('./pages/complaints/ComplaintPages.jsx').then(m => ({ default: m.RestaurantComplaintsPage })))
const RestaurantComplaintDetailPage = lazy(() => import('./pages/complaints/ComplaintPages.jsx').then(m => ({ default: m.RestaurantComplaintDetailPage })))

// Dashboard & Analytics
const DashboardPage         = lazy(() => import('./pages/dashboard/DashboardPage.jsx'))
const InsightsPage          = lazy(() => import('./pages/insights/InsightsPage.jsx'))

// Staff
const StaffPage             = lazy(() => import('./pages/staff/StaffPage.jsx'))
const InviteStaffPage       = lazy(() => import('./pages/staff/StaffPage.jsx').then(m => ({ default: m.InviteStaffPage })))

// Marketing
const MarketingPage         = lazy(() => import('./pages/marketing/MarketingPage.jsx'))

// Payments
const PaymentsPage          = lazy(() => import('./pages/payments/PaymentsPage.jsx'))

// ─── Route guards ─────────────────────────────────────────────────────────────
// ACTIVE statuses that can access the full portal
const PORTAL_ALLOWED = ['ACTIVE']

function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing, restaurantStatus } = useSelector(s => s.auth)
  const location = useLocation()

  // Show loading while restoring session
  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center"><span className="spinner spinner-lg" /></div>
  }

  // Not logged in → login page
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  // Logged in but restaurant not approved → pending page
  if (!restaurantStatus || !PORTAL_ALLOWED.includes(restaurantStatus)) {
    return <Navigate to="/auth/pending" replace />
  }

  return children
}

function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <div className="w-14 h-14 rounded-2xl bg-bg-section flex items-center justify-center mb-4">
        <Wrench size={28} className="text-text-muted" />
      </div>
      <h2 className="text-xl font-bold text-text-primary">{title}</h2>
      <p className="text-sm text-text-muted mt-1">Being built in a future phase.</p>
    </div>
  )
}

// Restores session on page refresh
function SessionRestore({ children }) {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(initRestaurantAuth())
  }, [dispatch])
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/auth/login"    element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/pending"  element={<PendingApprovalPage />} />
      <Route path="/documents/reupload" element={<DocumentReuploadPage />} />

      {/* Protected portal — only ACTIVE restaurants */}
      <Route path="/*" element={
        <ProtectedRoute>
          <RestaurantLayout>
            <Routes>
              <Route path="/dashboard"           element={<DashboardPage />} />
              <Route path="/orders"              element={<LiveOrdersPage />} />
              <Route path="/orders/history"      element={<OrderHistoryPage />} />
              <Route path="/kitchen"             element={<KitchenDisplayPage />} />
              <Route path="/menu"                element={<MenuPage />} />
              <Route path="/menu/items/new"      element={<ItemFormPage />} />
              <Route path="/menu/items/:id/edit" element={<ItemFormPage />} />
              <Route path="/insights"            element={<InsightsPage />} />
              <Route path="/staff"               element={<StaffPage />} />
              <Route path="/staff/invite"        element={<InviteStaffPage />} />
              <Route path="/marketing"           element={<MarketingPage />} />
              <Route path="/delivery"            element={<DeliverySettingsPage />} />
              <Route path="/payments"            element={<PaymentsPage />} />
              <Route path="/complaints"          element={<RestaurantComplaintsPage />} />
              <Route path="/complaints/:id"      element={<RestaurantComplaintDetailPage />} />
              <Route path="/profile"             element={<ProfileSettingsPage />} />
              <Route path="/hours"               element={<HoursSettingsPage />} />
              <Route path="/notifications"       element={<NotifSettingsPage />} />
              <Route path="*"                    element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </RestaurantLayout>
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
