// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import SkillsSelection from './pages/SkillsSelection';
import Guilds from './pages/Guilds';
import BrowseGuilds from './pages/BrowseGuilds';
import AdminDashboard from './pages/AdminDashboard';

// Guards a route — redirects to /login if not authenticated
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading, authenticating } = useAuth();
  if (isLoading || authenticating || (!user && token)) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontFamily: "'Prompt', sans-serif", color: '#888',
      }}>
        Loading...
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// Guards admin routes — must be ROLE_GUILDMASTER
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading, authenticating } = useAuth();
  if (isLoading || authenticating || (!user && token)) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontFamily: "'Prompt', sans-serif", color: '#888',
      }}>
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ROLE_GUILDMASTER') return <Navigate to="/guilds" replace />;
  return <>{children}</>;
}

// Redirects logged-in users away from auth pages
// Guildmasters go to /admin, adventurers go to /guilds
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, authenticating, transitioning } = useAuth();
  if (isLoading || authenticating || transitioning) {
    return null;
  }
  if (user) {
    return <Navigate to={user.role === 'ROLE_GUILDMASTER' ? '/admin' : '/guilds'} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        input:focus { border-color: #34C759 !important; box-shadow: 0 0 0 3px rgba(52,199,89,0.15); outline: none; }
        textarea:focus { border-color: #34C759 !important; box-shadow: 0 0 0 3px rgba(52,199,89,0.15); outline: none; }
        button:hover:not(:disabled) { filter: brightness(0.93); }
      `}</style>

      <BrowserRouter>
        <Routes>
          {/* Default → login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public auth routes */}
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* First-time skills screen (adventurers only) */}
          <Route path="/skills" element={<PrivateRoute><SkillsSelection /></PrivateRoute>} />

          {/* Adventurer routes */}
          <Route path="/guilds"        element={<PrivateRoute><Guilds /></PrivateRoute>} />
          <Route path="/guilds/browse" element={<PrivateRoute><BrowseGuilds /></PrivateRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          {/* Legacy redirect */}
          <Route path="/dashboard" element={<Navigate to="/guilds" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}