import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Provider, useDispatch } from 'react-redux'
import { store } from './store/index.js'
import { ToastProvider } from './components/global/index.jsx'
import { ProtectedRoute, GuestRoute } from './layouts/ProtectedRoute.jsx'
import { initAuth } from './store/slices/authSlice.js'

// Auth
const SplashPage          = lazy(() => import('./pages/auth/SplashPage.jsx'))
const LoginPage           = lazy(() => import('./pages/auth/LoginPage.jsx'))
const SignUpPage           = lazy(() => import('./pages/auth/SignUpPage.jsx'))
const OtpVerifyPage       = lazy(() => import('./pages/auth/OtpVerifyPage.jsx'))
const ForgotPasswordPage  = lazy(() => import('./pages/auth/ForgotPasswordPage.jsx'))
const ProfileSetupPage    = lazy(() => import('./pages/auth/ProfileSetupPage.jsx'))
const OAuthCallbackPage   = lazy(() => import('./pages/auth/OAuthCallbackPage.jsx'))

// Profile P2
const ProfilePage         = lazy(() => import('./pages/profile/ProfilePage.jsx'))
const EditProfilePage     = lazy(() => import('./pages/profile/EditProfilePage.jsx'))
const AddressesPage       = lazy(() => import('./pages/profile/AddressesPage.jsx'))
const AddAddressPage      = lazy(() => import('./pages/profile/AddAddressPage.jsx'))
const AccountSettingsPage = lazy(() => import('./pages/settings/AccountSettingsPage.jsx'))
const PaymentMethodsPage = lazy(() => import('./pages/settings/PaymentMethodsPage.jsx'))

// CMS
const PrivacyPolicyPage   = lazy(() => import('./pages/static/CmsPages.jsx').then(m => ({ default: m.PrivacyPolicyPage })))
const TermsPage           = lazy(() => import('./pages/static/CmsPages.jsx').then(m => ({ default: m.TermsPage })))

// Cart & Checkout P4
const CartPage              = lazy(() => import('./pages/cart/CartPage.jsx'))
const CheckoutPage          = lazy(() => import('./pages/checkout/CheckoutPage.jsx'))
const ScheduleDeliveryPage  = lazy(() => import('./pages/checkout/ScheduleDeliveryPage.jsx'))
const GiftOrderPage         = lazy(() => import('./pages/checkout/GiftOrderPage.jsx'))
const PaymentPage           = lazy(() => import('./pages/payment/PaymentPage.jsx'))
const OrderSuccessPage      = lazy(() => import('./pages/payment/OrderResultPages.jsx').then(m => ({ default: m.OrderSuccessPage })))
const OrderUnsuccessfulPage = lazy(() => import('./pages/payment/OrderResultPages.jsx').then(m => ({ default: m.OrderUnsuccessfulPage })))
const OrderTrackingPage     = lazy(() => import('./pages/tracking/OrderTrackingPage.jsx'))
const PickupReadyPage       = lazy(() => import('./pages/tracking/PickupPages.jsx').then(m => ({ default: m.PickupReadyPage })))
const PickupCompletePage    = lazy(() => import('./pages/tracking/PickupPages.jsx').then(m => ({ default: m.PickupCompletePage })))

// P6 — Group Orders & Post-Order
const GroupOrderPage        = lazy(() => import('./pages/groups/GroupOrderPage.jsx'))
const InvitePanel           = lazy(() => import('./pages/groups/GroupPages.jsx').then(m => ({ default: m.InvitePanel })))
const GroupSummaryPage      = lazy(() => import('./pages/groups/GroupPages.jsx').then(m => ({ default: m.GroupSummaryPage })))
const MyGroupsPage          = lazy(() => import('./pages/groups/GroupPages.jsx').then(m => ({ default: m.MyGroupsPage })))
const MyOrdersPage          = lazy(() => import('./pages/orders/MyOrdersPage.jsx'))
const CustomerOrderDetailPage = lazy(() => import('./pages/orders/MyOrdersPage.jsx').then(m => ({ default: m.OrderDetailPage })))
const ComplaintPage         = lazy(() => import('./pages/orders/ComplaintPage.jsx'))

// P7 — Wallet, Gift Cards, Subscriptions, Referrals
const WalletPage            = lazy(() => import('./pages/wallet/WalletPage.jsx'))
const TopUpPage             = lazy(() => import('./pages/wallet/TopUpPage.jsx'))
const GiftCardsPage         = lazy(() => import('./pages/giftcards/GiftCardsPage.jsx'))
const SubscriptionPage      = lazy(() => import('./pages/subscriptions/SubscriptionPage.jsx'))
const ReferralPage          = lazy(() => import('./pages/referrals/ReferralPage.jsx'))

// P9 — Student, Help, Notifications
const StudentVerifyPage     = lazy(() => import('./pages/student/StudentVerifyPage.jsx'))
const StudentStatusPage     = lazy(() => import('./pages/student/StudentStatusPage.jsx'))
const HelpPage              = lazy(() => import('./pages/help/HelpPage.jsx'))
const NotificationsPage     = lazy(() => import('./pages/notifications/NotificationsPage.jsx'))

// Discovery P3
const HomePage            = lazy(() => import('./pages/home/HomePage.jsx'))
const SearchPage          = lazy(() => import('./pages/search/SearchPage.jsx'))
const RestaurantPage      = lazy(() => import('./pages/restaurant/RestaurantPage.jsx'))

function ComingSoon({ page }) {
  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center">
      <div className="text-center"><div className="text-6xl mb-4">🚧</div>
      <h2 className="text-xl font-bold text-text-primary">{page}</h2>
      <p className="text-sm text-text-muted mt-1">Coming in a future phase</p></div>
    </div>
  )
}

function LoadingScreen() {
  return <div className="min-h-screen bg-bg-app flex items-center justify-center"><div className="spinner spinner-lg" /></div>
}

function SessionRestore({ children }) {
  const dispatch = useDispatch()
  useEffect(() => {
    if (localStorage.getItem('tastr_refresh')) {
      dispatch(initAuth())
    }
  }, [dispatch])
  return children
}

export default function App() {
  return (
    <Provider store={store}>
      <ToastProvider>
        <BrowserRouter>
          <SessionRestore>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/"                               element={<SplashPage />} />
              <Route path="/auth/login"                     element={<GuestRoute><LoginPage /></GuestRoute>} />
              <Route path="/auth/register"                  element={<GuestRoute><SignUpPage /></GuestRoute>} />
              <Route path="/auth/otp-verify"                element={<OtpVerifyPage />} />
              <Route path="/auth/forgot-password"           element={<ForgotPasswordPage />} />
              <Route path="/auth/profile-setup"             element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />
              <Route path="/auth/oauth-callback"            element={<OAuthCallbackPage />} />
              <Route path="/privacy"                        element={<PrivacyPolicyPage />} />
              <Route path="/terms"                          element={<TermsPage />} />

              {/* P3 Discovery — PUBLIC (anyone can browse) */}
              <Route path="/home"                           element={<HomePage />} />
              <Route path="/search"                         element={<SearchPage />} />
              <Route path="/restaurants/:id"                element={<RestaurantPage />} />

              {/* Profile P2 */}
              <Route path="/profile"                        element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/profile/edit"                   element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
              <Route path="/profile/addresses"              element={<ProtectedRoute><AddressesPage /></ProtectedRoute>} />
              <Route path="/profile/addresses/add"          element={<ProtectedRoute><AddAddressPage /></ProtectedRoute>} />
              <Route path="/profile/addresses/edit/:id"     element={<ProtectedRoute><AddAddressPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
              <Route path="/settings/:tab" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
              <Route path="/payment-methods" element={<ProtectedRoute><PaymentMethodsPage /></ProtectedRoute>} />

              {/* P4 Cart & Checkout */}
              <Route path="/cart"                           element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
              <Route path="/checkout"                       element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
              <Route path="/checkout/schedule"              element={<ProtectedRoute><ScheduleDeliveryPage /></ProtectedRoute>} />
              <Route path="/checkout/gift"                  element={<ProtectedRoute><GiftOrderPage /></ProtectedRoute>} />
              <Route path="/checkout/payment"               element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
              <Route path="/order-success"                  element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>} />
              <Route path="/order-failed"                   element={<ProtectedRoute><OrderUnsuccessfulPage /></ProtectedRoute>} />
              <Route path="/tracking/:orderId"              element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>} />
              <Route path="/pickup-ready"                   element={<ProtectedRoute><PickupReadyPage /></ProtectedRoute>} />
              <Route path="/pickup-complete"                element={<ProtectedRoute><PickupCompletePage /></ProtectedRoute>} />

              {/* P6 — Group Orders */}
              <Route path="/group-order"                   element={<ProtectedRoute><GroupOrderPage /></ProtectedRoute>} />
              <Route path="/group/:groupId/invite"         element={<ProtectedRoute><InvitePanel /></ProtectedRoute>} />
              <Route path="/group/:groupId/join"            element={<ProtectedRoute><GroupOrderPage /></ProtectedRoute>} />
              <Route path="/group/:groupId/summary"        element={<ProtectedRoute><GroupSummaryPage /></ProtectedRoute>} />
              <Route path="/groups/my"                     element={<ProtectedRoute><MyGroupsPage /></ProtectedRoute>} />

              {/* P6 — My Orders & Post-Order */}
              <Route path="/orders"                        element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
              <Route path="/orders/:orderId"               element={<ProtectedRoute><CustomerOrderDetailPage /></ProtectedRoute>} />
              <Route path="/complaints/new"                element={<ProtectedRoute><ComplaintPage /></ProtectedRoute>} />

              {/* Future phases */}
              <Route path="/wallet"                         element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
              <Route path="/wallet/topup"                   element={<ProtectedRoute><TopUpPage /></ProtectedRoute>} />
              <Route path="/gift-cards"                     element={<ProtectedRoute><GiftCardsPage /></ProtectedRoute>} />
              <Route path="/subscriptions"                  element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
              <Route path="/referrals"                      element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
              <Route path="/student-verify"                 element={<ProtectedRoute><StudentVerifyPage /></ProtectedRoute>} />
              <Route path="/student-status"                element={<ProtectedRoute><StudentStatusPage /></ProtectedRoute>} />
              <Route path="/help"                           element={<HelpPage />} />
              <Route path="/notifications"                  element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="*"                               element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          </SessionRestore>
        </BrowserRouter>
      </ToastProvider>
    </Provider>
  )
}
