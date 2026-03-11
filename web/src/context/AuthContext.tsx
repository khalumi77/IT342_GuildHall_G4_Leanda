// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/authApi';
import type { UserDto } from '../api/authApi';

interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<UserDto>;
  register: (email: string, username: string, password: string) => Promise<UserDto>;
  saveSkills: (skills: string[]) => Promise<void>;
  logout: () => void;
  googleLogin: (idToken: string) => Promise<UserDto>;
}

const AuthContext = createContext<AuthContextType | null>(null);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Re-hydrate session on page reload
  useEffect(() => {
    const savedToken = localStorage.getItem('guildhall_token');
    if (savedToken) {
      setToken(savedToken);
      authApi.me()
        .then(res => setUser(res.data.data.user))
        .catch(() => {
          localStorage.removeItem('guildhall_token');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const persistToken = (t: string) => {
    localStorage.setItem('guildhall_token', t);
    setToken(t);
  };

  const login = async (username: string, password: string): Promise<UserDto> => {
    const res = await authApi.login({ username, password });
    const { token: t, user: u } = res.data.data;
    persistToken(t);
    setUser(u);
    return u;
  };

  const register = async (email: string, username: string, password: string): Promise<UserDto> => {
    const res = await authApi.register({ email, username, password });
    const { token: t, user: u } = res.data.data;
    persistToken(t);
    setUser(u);
    return u;
  };

  const saveSkills = async (skills: string[]): Promise<void> => {
    const res = await authApi.saveSkills(skills);
    const { token: t, user: u } = res.data.data;
    persistToken(t);
    setUser(u);
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem('guildhall_token');
    setToken(null);
    setUser(null);
  };

    const googleLogin = async (idToken: string): Promise<UserDto> => {
    const res = await authApi.googleLogin(idToken);
    const { token: t, user: u } = res.data.data;
    persistToken(t);
    setUser(u);
    return u;
  };


  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, saveSkills, logout, googleLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}