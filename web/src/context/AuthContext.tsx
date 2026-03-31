// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/authApi';
import type { UserDto } from '../api/authApi';

interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  isLoading: boolean;
  authenticating: boolean;
  transitioning: boolean;
  login: (username: string, password: string) => Promise<UserDto>;
  register: (email: string, username: string, password: string) => Promise<UserDto>;
  saveSkills: (skills: string[]) => Promise<void>;
  logout: () => void;
  // Called by GoogleCallback page after backend-driven OAuth2 completes
  setTokenFromCallback: (token: string) => Promise<UserDto | null>;
  setTransitioning: (v: boolean) => void;
  updateUserState: (partial: Partial<UserDto>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Re-hydrate session on page reload
  useEffect(() => {
    const savedToken = localStorage.getItem('guildhall_token');
    if (savedToken) {
      setToken(savedToken);
      authApi.me()
        .then(res => setUser(res.data.data.user))
        .catch(() => { localStorage.removeItem('guildhall_token'); setToken(null); })
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
    setAuthenticating(true);
    try {
      const res = await authApi.login({ username, password });
      const { token: t, user: u } = res.data.data;
      persistToken(t);
      setUser(u);
      return u;
    } finally {
      setAuthenticating(false);
    }
  };

  const register = async (email: string, username: string, password: string): Promise<UserDto> => {
    setAuthenticating(true);
    try {
      const res = await authApi.register({ email, username, password });
      const { token: t, user: u } = res.data.data;
      persistToken(t);
      setUser(u);
      return u;
    } finally {
      setAuthenticating(false);
    }
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

  /**
   * Used by the GoogleCallback page.
   * Stores the JWT returned by the backend redirect, then fetches the full
   * user profile from /auth/me to populate the auth context.
   */
  const setTokenFromCallback = async (newToken: string): Promise<UserDto | null> => {
    persistToken(newToken);
    try {
      const res = await authApi.me();
      const u = res.data.data.user;
      setUser(u);
      return u;
    } catch {
      localStorage.removeItem('guildhall_token');
      setToken(null);
      return null;
    }
  };

  const updateUserState = (partial: Partial<UserDto>) => {
    setUser(prev => prev ? { ...prev, ...partial } : prev);
  };

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, authenticating, transitioning,
      login, register, saveSkills, logout,
      setTokenFromCallback, setTransitioning, updateUserState,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}