import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi, setAccessToken, clearAccessToken } from '../../services/api.js';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ─── Init Auth — called on app startup to restore session from refresh token ──
export const initAuth = createAsyncThunk('auth/init', async (_, { rejectWithValue }) => {
  const refreshToken = localStorage.getItem('tastr_refresh');
  if (!refreshToken) return rejectWithValue('No refresh token');
  try {
    const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
    setAccessToken(data.tokens.accessToken);
    localStorage.setItem('tastr_refresh', data.tokens.refreshToken);
    const meRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${data.tokens.accessToken}` }
    });
    return meRes.data;
  } catch (err) {
    clearAccessToken();
    localStorage.removeItem('tastr_refresh');
    return rejectWithValue('Session expired');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try { const res = await authApi.register(data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data || { message: 'Registration failed' }); }
});

export const loginUser = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try { const res = await authApi.login(data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data || { message: 'Login failed' }); }
});

export const sendOtp = createAsyncThunk('auth/sendOtp', async (data, { rejectWithValue }) => {
  try { const res = await authApi.sendOtp(data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data || { message: 'Failed to send OTP' }); }
});

export const verifyOtp = createAsyncThunk('auth/verifyOtp', async (data, { rejectWithValue }) => {
  try { const res = await authApi.verifyOtp(data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data || { message: 'OTP verification failed' }); }
});

export const resetPassword = createAsyncThunk('auth/resetPassword', async (data, { rejectWithValue }) => {
  try { const res = await authApi.resetPassword(data); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data || { message: 'Password reset failed' }); }
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try { const res = await authApi.getMe(); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try { await authApi.logout(); } catch {}
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:            null,
    isAuthenticated: false,
    isLoading:       false,
    isInitializing:  !!localStorage.getItem('tastr_refresh'),  // only true if there's a token to restore
    error:           null,
    otpSent:         false,
    otpVerified:     false,
  },
  reducers: {
    clearError:   (state) => { state.error = null; },
    clearOtpState:(state) => { state.otpSent = false; state.otpVerified = false; },
    setUser:      (state, action) => { state.user = action.payload; state.isAuthenticated = !!action.payload; },
  },
  extraReducers: (builder) => {
    // ── Init Auth (session restore on refresh) ──
    builder.addCase(initAuth.pending,   (s) => { s.isInitializing = true; });
    builder.addCase(initAuth.fulfilled, (s, a) => {
      s.isInitializing = false;
      s.user = a.payload.user;
      s.isAuthenticated = true;
    });
    builder.addCase(initAuth.rejected,  (s) => {
      s.isInitializing = false;
      s.user = null;
      s.isAuthenticated = false;
    });

    // Register
    builder.addCase(registerUser.pending,   (s) => { s.isLoading = true; s.error = null; });
    builder.addCase(registerUser.fulfilled, (s, a) => {
      s.isLoading = false; s.user = a.payload.user; s.isAuthenticated = true;
      setAccessToken(a.payload.tokens.accessToken);
      localStorage.setItem('tastr_refresh', a.payload.tokens.refreshToken);
    });
    builder.addCase(registerUser.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; });

    // Login
    builder.addCase(loginUser.pending,   (s) => { s.isLoading = true; s.error = null; });
    builder.addCase(loginUser.fulfilled, (s, a) => {
      s.isLoading = false; s.user = a.payload.user; s.isAuthenticated = true;
      setAccessToken(a.payload.tokens.accessToken);
      localStorage.setItem('tastr_refresh', a.payload.tokens.refreshToken);
    });
    builder.addCase(loginUser.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; });

    // Send OTP
    builder.addCase(sendOtp.pending,   (s) => { s.isLoading = true; s.error = null; });
    builder.addCase(sendOtp.fulfilled, (s) => { s.isLoading = false; s.otpSent = true; });
    builder.addCase(sendOtp.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; });

    // Verify OTP
    builder.addCase(verifyOtp.pending,   (s) => { s.isLoading = true; s.error = null; });
    builder.addCase(verifyOtp.fulfilled, (s, a) => {
      s.isLoading = false; s.otpVerified = true;
      if (a.payload.user) {
        s.user = a.payload.user; s.isAuthenticated = true;
        setAccessToken(a.payload.tokens.accessToken);
        localStorage.setItem('tastr_refresh', a.payload.tokens.refreshToken);
      }
    });
    builder.addCase(verifyOtp.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; });

    // Reset password
    builder.addCase(resetPassword.pending,   (s) => { s.isLoading = true; s.error = null; });
    builder.addCase(resetPassword.fulfilled, (s) => { s.isLoading = false; });
    builder.addCase(resetPassword.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload; });

    // Fetch me
    builder.addCase(fetchMe.fulfilled, (s, a) => { s.user = a.payload.user; s.isAuthenticated = true; });
    builder.addCase(fetchMe.rejected,  (s) => { s.user = null; s.isAuthenticated = false; clearAccessToken(); localStorage.removeItem('tastr_refresh'); });

    // Logout
    builder.addCase(logoutUser.fulfilled, (s) => {
      s.user = null; s.isAuthenticated = false;
      clearAccessToken(); localStorage.removeItem('tastr_refresh');
    });
  },
});

export const { clearError, clearOtpState, setUser } = authSlice.actions;
export default authSlice.reducer;
