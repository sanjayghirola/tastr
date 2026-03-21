import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ─── Create axios instance ────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Token management (in-memory for security) ────────────────────────────────
let accessToken = null;

export function setAccessToken(token) { accessToken = token; }
export function clearAccessToken()    { accessToken = null; }
export function getAccessToken()      { return accessToken; }

// ─── Request interceptor — attach token ───────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — handle 401 & token refresh ───────────────────────
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newToken) {
  refreshSubscribers.forEach(cb => cb(newToken));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('tastr_refresh');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const newAccess = data.tokens.accessToken;

        setAccessToken(newAccess);
        localStorage.setItem('tastr_refresh', data.tokens.refreshToken);
        onRefreshed(newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshErr) {
        clearAccessToken();
        localStorage.removeItem('tastr_refresh');
        window.dispatchEvent(new Event('tastr:logout'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// ─── Auth API calls ───────────────────────────────────────────────────────────
export const authApi = {
  register:        (data) => api.post('/auth/register', data),
  login:           (data) => api.post('/auth/login', data),
  sendOtp:         (data) => api.post('/auth/otp/send', data),
  verifyOtp:       (data) => api.post('/auth/otp/verify', data),
  resetPassword:   (data) => api.post('/auth/password/reset', data),
  refresh:         (data) => api.post('/auth/refresh', data),
  logout:          ()     => api.post('/auth/logout'),
  getMe:           ()     => api.get('/auth/me'),
};
