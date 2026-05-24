import axios from 'axios';
import { API_BASE_URL } from './constants';

const api = axios.create({
 baseURL: `${API_BASE_URL}/api/admin`,
 withCredentials: true, // Sends httpOnly cookies automatically
 headers: { 'Content-Type': 'application/json' },
 timeout: 15000,
});

/* ── Request interceptor ────────────────────────────────────────── */
api.interceptors.request.use(
 (config) => config,
 (error) => Promise.reject(error),
);

/* ── Response interceptor ───────────────────────────────────────── */
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
 refreshSubscribers.push(cb);
}
function onRefreshed(token: string) {
 refreshSubscribers.forEach((cb) => cb(token));
 refreshSubscribers = [];
}

api.interceptors.response.use(
 (response) => response,
 async (error) => {
 const originalRequest = error.config;

 if (error.response?.status === 401 && !originalRequest._retry) {
 if (isRefreshing) {
 return new Promise((resolve) => {
 subscribeTokenRefresh(() => {
 resolve(api(originalRequest));
 });
 });
 }

 originalRequest._retry = true;
 isRefreshing = true;

 try {
 await api.post('/auth/refresh');
 onRefreshed('');
 isRefreshing = false;
 return api(originalRequest);
 } catch {
 isRefreshing = false;
 if (typeof window !== 'undefined') {
 window.location.href = '/login';
 }
 return Promise.reject(error);
 }
 }

 if (error.response?.status === 403) {
 if (typeof window !== 'undefined') {
 window.location.href = '/unauthorized';
 }
 }

 return Promise.reject(error);
 },
);

export default api;
