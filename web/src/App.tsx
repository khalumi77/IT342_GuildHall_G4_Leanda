// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import SkillsSelection from './pages/SkillsSelection';
import Guilds from './pages/Guilds';
import BrowseGuilds from './pages/BrowseGuilds';

// Guards a route — redirects to /login if not authenticated
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', fontFamily: "'Prompt', sans-serif", color: '#888',
    }}>
      Loading...
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// Redirects logged-in users away from auth pages
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Navigate to="/guilds" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        input:focus { border-color: #34C759 !important; box-shadow: 0 0 0 3px rgba(52,199,89,0.15); outline: none; }
        button:hover:not(:disabled) { filter: brightness(0.93); }
      `}</style>

      <BrowserRouter>
        <Routes>
          {/* Default → login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public auth routes */}
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* First-time skills screen */}
          <Route path="/skills" element={<PrivateRoute><SkillsSelection /></PrivateRoute>} />

          {/* Protected app routes */}
          <Route path="/guilds"        element={<PrivateRoute><Guilds /></PrivateRoute>} />
          <Route path="/guilds/browse" element={<PrivateRoute><BrowseGuilds /></PrivateRoute>} />

          {/* Legacy /dashboard redirect → /guilds */}
          <Route path="/dashboard" element={<Navigate to="/guilds" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}