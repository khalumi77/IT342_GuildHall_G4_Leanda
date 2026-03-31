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
import Profile from './pages/Profile';
import UserProfileView from './pages/UserProfileView';
import GuildDashboard from './pages/GuildDashboard';
import CommissionedQuests from './pages/CommissionedQuests';
import GoogleCallback from './pages/GoogleCallback';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading, authenticating } = useAuth();
  if (isLoading || authenticating || (!user && token)) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Prompt', sans-serif", color: '#888' }}>Loading...</div>;
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading, authenticating } = useAuth();
  if (isLoading || authenticating || (!user && token)) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Prompt', sans-serif", color: '#888' }}>Loading...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ROLE_GUILDMASTER') return <Navigate to="/guilds" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, authenticating, transitioning } = useAuth();
  if (isLoading || authenticating || transitioning) return null;
  if (user) return <Navigate to={user.role === 'ROLE_GUILDMASTER' ? '/admin' : '/guilds'} replace />;
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
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/auth/google/success" element={<GoogleCallback />} />
          <Route path="/skills"  element={<PrivateRoute><SkillsSelection /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/guilds"              element={<PrivateRoute><Guilds /></PrivateRoute>} />
          <Route path="/guilds/browse"       element={<PrivateRoute><BrowseGuilds /></PrivateRoute>} />
          <Route path="/guilds/:guildId"     element={<PrivateRoute><GuildDashboard /></PrivateRoute>} />
          <Route path="/quests/commissioned" element={<PrivateRoute><CommissionedQuests /></PrivateRoute>} />
          <Route path="/quests/accepted"     element={<PrivateRoute><Navigate to="/guilds" replace /></PrivateRoute>} />
          <Route path="/admin"               element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users/:userId" element={<AdminRoute><UserProfileView /></AdminRoute>} />
          <Route path="/dashboard" element={<Navigate to="/guilds" replace />} />
          <Route path="*"          element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}