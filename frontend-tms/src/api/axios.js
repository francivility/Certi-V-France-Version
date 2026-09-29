import axios from 'axios';
import { getAccess, getRefresh, setTokens, clearAuth } from './auth';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
});

const PUBLIC_ENDPOINTS = ['accounts/login/', 'accounts/staff-login/', 'accounts/token/refresh/'];

api.interceptors.request.use((config) => {
  const isPublic = PUBLIC_ENDPOINTS.some((endpoint) => config.url.includes(endpoint));
  const token = getAccess();
  if (token && !isPublic) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pending = [];

function redirectToLogin() {
  clearAuth();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response && response.status === 401 && config && !config._retry && !isPublic(config.url)) {
      const refresh = getRefresh();
      if (!refresh) {
        redirectToLogin();
        return Promise.reject(error);
      }
      config._retry = true;
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pending.push({ resolve, reject });
        }).then(() => api(config));
      }
      isRefreshing = true;
      try {
        const res = await axios.post('http://127.0.0.1:8000/api/accounts/token/refresh/', {
          refresh,
        });
        const newAccess = res.data.access;
        const newRefresh = res.data.refresh || refresh;
        setTokens({ access: newAccess, refresh: newRefresh });
        pending.forEach(({ resolve }) => resolve());
        pending = [];
        config.headers.Authorization = `Bearer ${newAccess}`;
        return api(config);
      } catch (refreshError) {
        pending.forEach(({ reject }) => reject(refreshError));
        pending = [];
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

function isPublic(url) {
  return PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

export default api;
