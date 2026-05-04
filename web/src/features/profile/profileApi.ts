import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('guildhall_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const profileApi = {
  me: () => api.get('/profile/me'),
  updateProfile: (payload: Record<string, unknown>) => api.put('/profile/me', payload),
  uploadAvatar: (payload: { profilePictureUrl: string }) => api.put('/profile/me', payload),
};

export default api;
