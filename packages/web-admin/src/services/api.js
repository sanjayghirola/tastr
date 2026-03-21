import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

let accessToken = null;
export function setAccessToken(token) { accessToken = token; }
export function clearAccessToken()    { accessToken = null; }

api.interceptors.request.use(config => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

api.interceptors.response.use(
  r => r,
  async error => {
    const orig = error.config;
    if (error.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise(res => refreshQueue.push(t => {
          orig.headers.Authorization = `Bearer ${t}`;
          res(api(orig));
        }));
      }
      orig._retry = true;
      isRefreshing = true;
      try {
        const refresh = localStorage.getItem('tastr_admin_refresh');
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refresh });
        setAccessToken(data.tokens.accessToken);
        localStorage.setItem('tastr_admin_refresh', data.tokens.refreshToken);
        refreshQueue.forEach(cb => cb(data.tokens.accessToken));
        refreshQueue = [];
        orig.headers.Authorization = `Bearer ${data.tokens.accessToken}`;
        return api(orig);
      } catch {
        clearAccessToken();
        localStorage.removeItem('tastr_admin_refresh');
        window.dispatchEvent(new Event('tastr:admin:logout'));
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const adminAuthApi = {
  login:  (data) => api.post('/auth/admin/login', data),
  getMe:  ()     => api.get('/auth/me'),
  logout: ()     => api.post('/auth/logout'),
  refresh:(data) => api.post('/auth/refresh', data),
  updateProfile: (data) => api.put('/auth/admin/profile', data),
  changePassword: (data) => api.put('/auth/admin/password', data),
};
