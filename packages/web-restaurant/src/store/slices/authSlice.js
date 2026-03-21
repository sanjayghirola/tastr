import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { restaurantAuthApi, setAccessToken, clearAccessToken } from '../../services/api.js';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ─── Init Auth — restore session from refresh token on app startup ────────────
export const initRestaurantAuth = createAsyncThunk('auth/init', async (_, { rejectWithValue }) => {
  const refreshToken = localStorage.getItem('tastr_restaurant_refresh');
  if (!refreshToken) return rejectWithValue('No refresh token');
  try {
    const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
    setAccessToken(data.tokens.accessToken);
    localStorage.setItem('tastr_restaurant_refresh', data.tokens.refreshToken);
    const meRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${data.tokens.accessToken}` }
    });
    let restaurantStatus = null;
    try {
      const statusRes = await axios.get(`${BASE_URL}/restaurants/status`, {
        headers: { Authorization: `Bearer ${data.tokens.accessToken}` }
      });
      restaurantStatus = statusRes.data.restaurant?.status || null;
    } catch {}
    return { user: meRes.data.user, restaurantStatus };
  } catch {
    clearAccessToken();
    localStorage.removeItem('tastr_restaurant_refresh');
    return rejectWithValue('Session expired');
  }
});

export const loginRestaurant = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await restaurantAuthApi.login(data);
    setAccessToken(res.data.tokens.accessToken);
    try {
      const statusRes = await api.get('/restaurants/status');
      return { ...res.data, restaurantStatus: statusRes.data.restaurant?.status || null };
    } catch { return { ...res.data, restaurantStatus: null }; }
  } catch (err) { return rejectWithValue(err.response?.data || { message: 'Login failed' }); }
});

export const fetchRestaurantMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const meRes = await restaurantAuthApi.getMe();
    try {
      const statusRes = await api.get('/restaurants/status');
      return { user: meRes.data.user, restaurantStatus: statusRes.data.restaurant?.status || null };
    } catch { return { user: meRes.data.user, restaurantStatus: null }; }
  } catch (err) { return rejectWithValue(err.response?.data); }
});

export const logoutRestaurant = createAsyncThunk('auth/logout', async () => {
  try { await restaurantAuthApi.logout(); } catch {}
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isInitializing: !!localStorage.getItem('tastr_restaurant_refresh'),
    error: null,
    restaurantStatus: null,
  },
  reducers: {
    clearError: s => { s.error = null; },
    setUser:    (s, a) => { s.user = a.payload; s.isAuthenticated = !!a.payload; },
    setRestaurantStatus: (s, a) => { s.restaurantStatus = a.payload; },
  },
  extraReducers: b => {
    b
      // Init Auth
      .addCase(initRestaurantAuth.pending,   s => { s.isInitializing = true; })
      .addCase(initRestaurantAuth.fulfilled, (s, a) => {
        s.isInitializing = false;
        s.user = a.payload.user;
        s.isAuthenticated = true;
        s.restaurantStatus = a.payload.restaurantStatus;
      })
      .addCase(initRestaurantAuth.rejected,  s => { s.isInitializing = false; s.user = null; s.isAuthenticated = false; })
      // Login
      .addCase(loginRestaurant.pending,   s => { s.isLoading = true; s.error = null; })
      .addCase(loginRestaurant.fulfilled, (s, a) => {
        s.isLoading = false; s.user = a.payload.user; s.isAuthenticated = true;
        s.restaurantStatus = a.payload.restaurantStatus;
        setAccessToken(a.payload.tokens.accessToken);
        localStorage.setItem('tastr_restaurant_refresh', a.payload.tokens.refreshToken);
      })
      .addCase(loginRestaurant.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; })
      // Fetch me
      .addCase(fetchRestaurantMe.fulfilled, (s, a) => {
        s.user = a.payload.user; s.isAuthenticated = true; s.restaurantStatus = a.payload.restaurantStatus;
      })
      .addCase(fetchRestaurantMe.rejected, s => {
        s.user = null; s.isAuthenticated = false; s.restaurantStatus = null; clearAccessToken();
      })
      // Logout
      .addCase(logoutRestaurant.fulfilled, s => {
        s.user = null; s.isAuthenticated = false; s.restaurantStatus = null;
        clearAccessToken(); localStorage.removeItem('tastr_restaurant_refresh');
      });
  },
});

export const { clearError, setUser, setRestaurantStatus } = authSlice.actions;
export default authSlice.reducer;
