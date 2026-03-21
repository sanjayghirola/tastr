import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminAuthApi, setAccessToken, clearAccessToken } from '../../services/api.js';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ─── Init Auth — restore session from refresh token on app startup ────────────
export const initAdminAuth = createAsyncThunk('auth/init', async (_, { rejectWithValue }) => {
  const refreshToken = localStorage.getItem('tastr_admin_refresh');
  if (!refreshToken) return rejectWithValue('No refresh token');
  try {
    const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
    setAccessToken(data.tokens.accessToken);
    localStorage.setItem('tastr_admin_refresh', data.tokens.refreshToken);
    const meRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${data.tokens.accessToken}` }
    });
    return meRes.data;
  } catch {
    clearAccessToken();
    localStorage.removeItem('tastr_admin_refresh');
    return rejectWithValue('Session expired');
  }
});

export const loginAdmin = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try { const res = await adminAuthApi.login(data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data || { message: 'Login failed' }); }
});

export const fetchAdminMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try { const res = await adminAuthApi.getMe(); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const logoutAdmin = createAsyncThunk('auth/logout', async () => {
  try { await adminAuthApi.logout(); } catch {}
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    admin: null,
    isAuthenticated: false,
    isLoading: false,
    isInitializing: !!localStorage.getItem('tastr_admin_refresh'),
    error: null
  },
  reducers: {
    clearError: s => { s.error = null; },
    setAdmin:   (s, a) => { s.admin = a.payload; s.isAuthenticated = !!a.payload; },
  },
  extraReducers: builder => {
    builder
      // Init Auth
      .addCase(initAdminAuth.pending,   s => { s.isInitializing = true; })
      .addCase(initAdminAuth.fulfilled, (s, a) => {
        s.isInitializing = false;
        s.admin = a.payload.user || a.payload.admin;
        s.isAuthenticated = true;
      })
      .addCase(initAdminAuth.rejected,  s => { s.isInitializing = false; s.admin = null; s.isAuthenticated = false; })
      // Login
      .addCase(loginAdmin.pending,   s => { s.isLoading = true; s.error = null; })
      .addCase(loginAdmin.fulfilled, (s, a) => {
        s.isLoading = false; s.admin = a.payload.user; s.isAuthenticated = true;
        setAccessToken(a.payload.tokens.accessToken);
        localStorage.setItem('tastr_admin_refresh', a.payload.tokens.refreshToken);
      })
      .addCase(loginAdmin.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; })
      // Fetch me
      .addCase(fetchAdminMe.fulfilled, (s, a) => { s.admin = a.payload.user || a.payload.admin; s.isAuthenticated = true; })
      .addCase(fetchAdminMe.rejected,  s => { s.admin = null; s.isAuthenticated = false; clearAccessToken(); })
      // Logout
      .addCase(logoutAdmin.fulfilled, s => {
        s.admin = null; s.isAuthenticated = false;
        clearAccessToken(); localStorage.removeItem('tastr_admin_refresh');
      });
  },
});

export const { clearError, setAdmin } = authSlice.actions;
export default authSlice.reducer;
