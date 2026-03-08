// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import SkillsSelection from './pages/SkillsSelection';

// Placeholder dashboard — replace with your real dashboard component later
function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: '40px', fontFamily: "'Prompt', sans-serif" }}>
      <h1 style={{ color: '#34C759' }}>Welcome, {user?.username}! ⚔️</h1>
      <p>Rank: <strong>{user?.rank}</strong> | Level: <strong>{user?.level}</strong> | XP: <strong>{user?.xp}</strong></p>
      {user?.skills?.length ? (
        <p>Skills: {user.skills.join(', ')}</p>
      ) : (
        <p style={{ color: '#888' }}>No skills set yet.</p>
      )}
      <button
        onClick={logout}
        style={{ marginTop: '20px', padding: '10px 24px', backgroundColor: '#c73434', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: "'Prompt', sans-serif" }}
      >
        Log Out
      </button>
    </div>
  );
}

// Guards a route — redirects to /login if not authenticated
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div style={{ padding: '40px', fontFamily: 'Prompt' }}>Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// Redirects logged-in users away from auth pages
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      {/* Google Fonts — Prompt */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        input:focus { border-color: #34C759 !important; box-shadow: 0 0 0 3px rgba(52,199,89,0.15); }
        button:hover:not(:disabled) { filter: brightness(0.93); }
      `}</style>

      <BrowserRouter>
        <Routes>
          {/* Default → login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public auth routes */}
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* First-time skills screen — needs to be authenticated (just registered) */}
          <Route path="/skills" element={<PrivateRoute><SkillsSelection /></PrivateRoute>} />

          {/* Protected app routes */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}