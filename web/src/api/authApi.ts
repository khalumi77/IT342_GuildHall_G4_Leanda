// src/api/authApi.ts
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({ baseURL: API_BASE });

// Attach JWT to every request if one exists in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('guildhall_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface UserDto {
  id: number;
  email: string;
  username: string;
  role: string;
  level: number;
  xp: number;
  rank: string;
  skills: string[];
  newUser: boolean;
  // Profile fields
  bio?: string;
  profilePictureUrl?: string;
  googleSub?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    success: boolean;
    token: string;
    user: UserDto;
  };
  timestamp: string;
}

export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: { username: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  saveSkills: (skills: string[]) =>
    api.post<AuthResponse>('/auth/skills', { skills }),

  me: () =>
    api.get<AuthResponse>('/auth/me'),

  logout: () =>
    api.post('/auth/logout'),

  googleLogin: (idToken: string) =>
    api.post<AuthResponse>('/auth/google', { idToken }),
};

export default api;