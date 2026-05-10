import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('guildhall_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const adminApi = {
  users: () => api.get('/admin/users'),
  userById: (userId: number | string) => api.get(`/admin/users/${userId}`),
  updateUser: (userId: number | string, payload: Record<string, unknown>) => api.put(`/admin/users/${userId}`, payload),
};

export default api;
