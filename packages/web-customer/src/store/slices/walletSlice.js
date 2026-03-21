import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api.js'

export const fetchWallet       = createAsyncThunk('wallet/fetch',    async (_, { rejectWithValue }) => {
  try { return (await api.get('/wallet')).data } catch (e) { return rejectWithValue(e.response?.data) }
})
export const fetchTransactions = createAsyncThunk('wallet/txs',      async (params, { rejectWithValue }) => {
  try { return (await api.get('/wallet/transactions', { params })).data } catch (e) { return rejectWithValue(e.response?.data) }
})
export const createTopUp       = createAsyncThunk('wallet/topup',    async (data, { rejectWithValue }) => {
  try { return (await api.post('/wallet/topup', data)).data } catch (e) { return rejectWithValue(e.response?.data) }
})
export const confirmTopUp      = createAsyncThunk('wallet/confirm',  async (data, { rejectWithValue }) => {
  try { return (await api.post('/wallet/topup/confirm', data)).data } catch (e) { return rejectWithValue(e.response?.data) }
})
export const fetchMyGiftCards  = createAsyncThunk('wallet/giftCards', async (_, { rejectWithValue }) => {
  try { return (await api.get('/gift-cards/mine')).data } catch (e) { return rejectWithValue(e.response?.data) }
})
export const purchaseGiftCard  = createAsyncThunk('wallet/purchaseGC', async (data, { rejectWithValue }) => {
  try { return (await api.post('/gift-cards/purchase', data)).data } catch (e) { return rejectWithValue(e.response?.data) }
})
export const confirmGiftCard   = createAsyncThunk('wallet/confirmGC', async (data, { rejectWithValue }) => {
  try { return (await api.post('/gift-cards/purchase/confirm', data)).data } catch (e) { return rejectWithValue(e.response?.data) }
})
export const redeemGiftCard    = createAsyncThunk('wallet/redeemGC', async (data, { rejectWithValue }) => {
  try { return (await api.post('/gift-cards/redeem', data)).data } catch (e) { return rejectWithValue(e.response?.data) }
})
export const fetchPlans        = createAsyncThunk('wallet/plans',    async (_, { rejectWithValue }) => {
  try { return (await api.get('/subscriptions/plans')).data } catch (e) { return rejectWithValue(e.response?.data) }
})
export const fetchMySub        = createAsyncThunk('wallet/mySub',    async (_, { rejectWithValue }) => {
  try { return (await api.get('/subscriptions/my')).data } catch (e) { return rejectWithValue(e.response?.data) }
})
export const subscribePlan     = createAsyncThunk('wallet/subscribe', async (data, { rejectWithValue }) => {
  try { return (await api.post('/subscriptions/subscribe', data)).data } catch (e) { return rejectWithValue(e.response?.data) }
})
export const cancelSub         = createAsyncThunk('wallet/cancel',   async (_, { rejectWithValue }) => {
  try { return (await api.post('/subscriptions/cancel')).data } catch (e) { return rejectWithValue(e.response?.data) }
})
export const fetchReferralStats= createAsyncThunk('wallet/referral', async (_, { rejectWithValue }) => {
  try { return (await api.get('/users/referral/stats')).data } catch (e) { return rejectWithValue(e.response?.data) }
})
export const applyReferralCode = createAsyncThunk('wallet/applyRef', async (data, { rejectWithValue }) => {
  try { return (await api.post('/users/referral/apply', data)).data } catch (e) { return rejectWithValue(e.response?.data) }
})

const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
    balance: 0,
    transactions: [],
    giftCards: [],
    plans: [],
    subscription: null,
    referral: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearWalletError: (s) => { s.error = null },
  },
  extraReducers: (b) => {
    const load = (thunk, key) => {
      b.addCase(thunk.pending,  (s) => { s.isLoading = true; s.error = null })
      b.addCase(thunk.fulfilled,(s, a) => {
        s.isLoading = false
        if (key) s[key] = a.payload[key] ?? a.payload
        if (a.payload?.balance !== undefined) s.balance = a.payload.balance
      })
      b.addCase(thunk.rejected, (s, a) => { s.isLoading = false; s.error = a.payload })
    }
    load(fetchWallet,       'transactions')
    load(fetchTransactions, 'transactions')
    load(fetchMyGiftCards,  'giftCards')
    load(fetchPlans,        'plans')
    b.addCase(fetchMySub.fulfilled, (s, a) => { s.isLoading = false; s.subscription = a.payload.subscription })
    b.addCase(fetchReferralStats.fulfilled, (s, a) => { s.isLoading = false; s.referral = a.payload })
    b.addCase(confirmTopUp.fulfilled, (s, a) => { s.balance = a.payload.balance ?? s.balance })
    b.addCase(cancelSub.fulfilled,    (s) => { if (s.subscription) s.subscription.cancelAtPeriodEnd = true })
  },
})

export const { clearWalletError } = walletSlice.actions
export default walletSlice.reducer
