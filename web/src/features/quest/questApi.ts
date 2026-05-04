import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('guildhall_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const questApi = {
  myCommissioned: () => api.get('/quests/commissioned'),
  myAccepted: () => api.get('/quests/accepted'),
  questDetail: (questId: number | string) => api.get(`/quests/${questId}`),
  createQuest: (payload: Record<string, unknown>) => api.post('/quests', payload),
};

export default api;
