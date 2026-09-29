import axios from 'axios';

// When VITE_API_BASE_URL is blank, use relative paths (/api/...) so the
// browser sends requests to the same origin. Vite's dev server then proxies
// those to the backend on localhost:8000. This works over localhost, LAN IP,
// and ngrok — all from the same code.
const envBase = import.meta.env.VITE_API_BASE_URL?.trim();
const baseURL = envBase ? `${envBase}/api/` : '/api/';

const api = axios.create({
  baseURL,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

const PUBLIC_ENDPOINTS = [
  'accounts/register/step1/',
  'accounts/login/',
  'accounts/google/',
  'accounts/password-reset/request/',
  'accounts/password-reset/confirm/',
];

api.interceptors.request.use((config) => {
  const isPublic = PUBLIC_ENDPOINTS.some((endpoint) => config.url.includes(endpoint));
  const token = localStorage.getItem('access');
  if (token && !isPublic && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;