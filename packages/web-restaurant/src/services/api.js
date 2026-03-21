import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' }, timeout: 15000 });

let accessToken = null;
export function setAccessToken(t) { accessToken = t; }
export function clearAccessToken() { accessToken = null; }

api.interceptors.request.use(c => {
  if (accessToken) c.headers.Authorization = `Bearer ${accessToken}`;
  return c;
});

let refreshing = false, queue = [];
api.interceptors.response.use(r => r, async err => {
  const orig = err.config;
  if (err.response?.status === 401 && !orig._retry) {
    if (refreshing) return new Promise(res => queue.push(t => { orig.headers.Authorization = `Bearer ${t}`; res(api(orig)); }));
    orig._retry = true; refreshing = true;
    try {
      const r = localStorage.getItem('tastr_restaurant_refresh');
      if (!r) throw new Error();
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: r });
      setAccessToken(data.tokens.accessToken);
      localStorage.setItem('tastr_restaurant_refresh', data.tokens.refreshToken);
      queue.forEach(cb => cb(data.tokens.accessToken)); queue = [];
      orig.headers.Authorization = `Bearer ${data.tokens.accessToken}`;
      return api(orig);
    } catch {
      clearAccessToken(); localStorage.removeItem('tastr_restaurant_refresh');
      window.dispatchEvent(new Event('tastr:restaurant:logout'));
      return Promise.reject(err);
    } finally { refreshing = false; }
  }
  return Promise.reject(err);
});

export default api;

export const restaurantAuthApi = {
  login:     (d) => api.post('/auth/restaurant/login', d),
  register:  (d) => api.post('/auth/register', d),
  getMe:     ()  => api.get('/auth/me'),
  logout:    ()  => api.post('/auth/logout'),
  refresh:   (d) => api.post('/auth/refresh', d),
  submitRegistration: (d) => api.post('/restaurants/register', d),
};
