import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api.js'

// ─── Async thunks (sync with backend cart) ───────────────────────────────────
export const fetchCart     = createAsyncThunk('cart/fetch',   async (_, { rejectWithValue }) => {
  try { return (await api.get('/cart')).data }
  catch (e) { return rejectWithValue(e.response?.data) }
})
export const apiAddItem    = createAsyncThunk('cart/add',     async (payload, { rejectWithValue }) => {
  try { return (await api.post('/cart/items', payload)).data }
  catch (e) { return rejectWithValue(e.response?.data) }
})
export const apiUpdateItem = createAsyncThunk('cart/update',  async ({ itemId, ...data }, { rejectWithValue }) => {
  try { return (await api.patch(`/cart/items/${itemId}`, data)).data }
  catch (e) { return rejectWithValue(e.response?.data) }
})
export const apiRemoveItem = createAsyncThunk('cart/remove',  async (itemId, { rejectWithValue }) => {
  try { return (await api.delete(`/cart/items/${itemId}`)).data }
  catch (e) { return rejectWithValue(e.response?.data) }
})
export const apiClearCart  = createAsyncThunk('cart/clear',   async (_, { rejectWithValue }) => {
  try { await api.delete('/cart'); return {} }
  catch (e) { return rejectWithValue(e.response?.data) }
})
export const apiApplyPromo = createAsyncThunk('cart/promo',   async (code, { rejectWithValue }) => {
  try { return (await api.post('/cart/promo', { code })).data }
  catch (e) { return rejectWithValue(e.response?.data) }
})
export const apiRemovePromo = createAsyncThunk('cart/removePromo', async (_, { rejectWithValue }) => {
  try { await api.delete('/cart/promo'); return {} }
  catch (e) { return rejectWithValue(e.response?.data) }
})
export const apiUpdateExtras = createAsyncThunk('cart/extras', async (data, { rejectWithValue }) => {
  try { return (await api.patch('/cart/extras', data)).data }
  catch (e) { return rejectWithValue(e.response?.data) }
})

// ─── Optimistic local-only helpers ────────────────────────────────────────────
// Used before backend syncs (instant UI feedback)
function applyCartResponse(state, cart) {
  if (!cart) { Object.assign(state, initialState); return }
  state.cart          = cart
  state.restaurantId  = cart.restaurantId
  state.restaurantName= cart.restaurantName
  state.items         = cart.items || []
  state.subtotal      = cart.subtotal || 0
  state.promoCode     = cart.promoCode || null
  state.promoDiscount = cart.promoDiscount || 0
  state.tip           = cart.tip || 0
  state.donation      = cart.donation || 0
  state.isGift        = cart.isGift || false
  state.giftRecipient = cart.giftRecipient || null
  state.customerNote  = cart.customerNote || ''
  state.disposableEssentials = cart.disposableEssentials || false
  // Pricing fields from platform config (populated by backend)
  state.serviceFee    = cart.serviceFee || 0
  state.markupTotal   = cart.markupTotal || 0
}

const initialState = {
  cart: null, restaurantId: null, restaurantName: null, items: [], subtotal: 0,
  promoCode: null, promoDiscount: 0, tip: 0, donation: 0,
  isGift: false, giftRecipient: null, customerNote: '', disposableEssentials: false,
  serviceFee: 0, markupTotal: 0,
  isLoading: false, isAdding: false, promoLoading: false,
  promoError: null, promoSuccess: null, error: null,
  // Pending cart-clear warning
  clearedCartWarning: false,
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearPromoMessages: s => { s.promoError = null; s.promoSuccess = null },
    dismissClearedWarning: s => { s.clearedCartWarning = false },
    // Optimistic local add (for instant UI before API responds)
    localAddItem: (s, a) => {
      const { restaurantId, restaurantName, item } = a.payload
      if (s.restaurantId && s.restaurantId !== restaurantId) {
        s.items = []; s.restaurantId = restaurantId; s.restaurantName = restaurantName
        s.promoCode = null; s.promoDiscount = 0
      }
      if (!s.restaurantId) { s.restaurantId = restaurantId; s.restaurantName = restaurantName }
      const key = JSON.stringify(item.selectedToppings)
      const existing = s.items.find(i => i.menuItemId === item.menuItemId && JSON.stringify(i.selectedToppings) === key)
      if (existing) { existing.quantity += item.quantity }
      else { s.items.push(item) }
      s.subtotal = s.items.reduce((sum, i) => sum + (i.price + (i.selectedToppings||[]).reduce((t,g) => t+g.price,0)) * i.quantity, 0)
    },
  },
  extraReducers: b => {
    const handle = (action, cb) => {
      b.addCase(action.pending,   s => { s.isLoading = true })
      b.addCase(action.fulfilled, (s, a) => { s.isLoading = false; cb(s, a) })
      b.addCase(action.rejected,  s => { s.isLoading = false })
    }
    handle(fetchCart,      (s, a) => applyCartResponse(s, a.payload.cart))
    handle(apiAddItem,     (s, a) => { applyCartResponse(s, a.payload.cart); if (a.payload.clearedCart) s.clearedCartWarning = true })
    handle(apiUpdateItem,  (s, a) => applyCartResponse(s, a.payload.cart))
    handle(apiRemoveItem,  (s, a) => applyCartResponse(s, a.payload.cart))
    handle(apiClearCart,   s => { Object.assign(s, initialState) })
    b.addCase(apiApplyPromo.pending,   s => { s.promoLoading = true; s.promoError = null; s.promoSuccess = null })
    b.addCase(apiApplyPromo.fulfilled, (s, a) => {
      s.promoLoading = false; s.promoDiscount = a.payload.discount
      s.promoSuccess = a.payload.message
    })
    b.addCase(apiApplyPromo.rejected,  (s, a) => { s.promoLoading = false; s.promoError = a.payload?.message || 'Invalid promo code' })
    b.addCase(apiRemovePromo.fulfilled, s => { s.promoCode = null; s.promoDiscount = 0; s.promoSuccess = null })
    handle(apiUpdateExtras, (s, a) => applyCartResponse(s, a.payload.cart))
  },
})

export const { clearPromoMessages, dismissClearedWarning, localAddItem } = cartSlice.actions

export const selectCartCount = s => s.cart.items.reduce((sum, i) => sum + i.quantity, 0)
export const selectCartTotal = s => {
  const { subtotal, promoDiscount, tip, donation, serviceFee } = s.cart
  const deliveryFee = s.cart.cart?.restaurantId?.deliveryFee || 0
  return Math.max(0, subtotal - promoDiscount + deliveryFee + (serviceFee || 0) + tip + donation)
}

export default cartSlice.reducer
export const selectCartItems = s => s.cart.items
