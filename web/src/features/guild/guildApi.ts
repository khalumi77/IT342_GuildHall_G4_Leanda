import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('guildhall_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const guildApi = {
  myGuilds: () => api.get('/guilds/my'),
  browseGuilds: () => api.get('/guilds'),
  guildDetail: (guildId: number | string) => api.get(`/guilds/${guildId}`),
  leaveGuild: (guildId: number | string) => api.delete(`/guilds/${guildId}/leave`),
};

export default api;
