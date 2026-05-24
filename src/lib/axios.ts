import axios from 'axios';

const api = axios.create({
 baseURL: '/api/admin',
 withCredentials: true,
 headers: {
 'Content-Type': 'application/json',
 },
});

// Interceptor to handle token refresh if needed
api.interceptors.response.use(
 (response) => response,
 async (error) => {
 const originalRequest = error.config;
 if (error.response?.status === 401 && !originalRequest._retry) {
 originalRequest._retry = true;
 try {
 await axios.post(
 `${api.defaults.baseURL}/auth/refresh`,
 {},
 { withCredentials: true }
 );
 return api(originalRequest);
 } catch (refreshError) {
 // Redirect to login if refresh fails
 if (typeof window !== 'undefined') {
 window.location.href = '/login';
 }
 return Promise.reject(refreshError);
 }
 }
 return Promise.reject(error);
 }
);

export default api;
