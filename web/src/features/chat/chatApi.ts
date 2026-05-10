import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('guildhall_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const chatApi = {
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (conversationId: number | string) => api.get(`/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: number | string, message: string) => api.post(`/chat/conversations/${conversationId}/messages`, { message }),
};

export default api;
