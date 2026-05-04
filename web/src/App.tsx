// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import Landing from './features/landing/Landing';
import Register from './features/auth/RegisterPage';
import Login from './features/auth/LoginPage';
import SkillsSelection from './features/auth/SkillsSelection';
import Guilds from './features/guild/GuildsPage';
import BrowseGuilds from './features/guild/BrowseGuilds';
import AdminDashboard from './features/admin/AdminDashboard';
import Profile from './features/profile/Profile';
import UserProfileView from './features/admin/UserProfileView';
import GuildDashboard from './features/guild/GuildDashboard';
import CommissionedQuests from './features/quest/CommissionedQuests';
import AcceptedQuests from './features/quest/AcceptedQuests';
import GoogleCallback from './features/auth/GoogleCallback';
import Chat from './features/chat/Chat';
import PaymentSuccess from './features/payment/PaymentSuccess';
import PaymentCancel from './features/payment/PaymentCancel';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading, authenticating } = useAuth();
  if (isLoading || authenticating || (!user && token)) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontFamily: "'Prompt', sans-serif", color: '#888',
        backgroundColor: '#0a150a',
      }}>
        Loading...
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading, authenticating } = useAuth();
  if (isLoading || authenticating || (!user && token)) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontFamily: "'Prompt', sans-serif", color: '#888',
        backgroundColor: '#0a150a',
      }}>
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ROLE_GUILDMASTER') return <Navigate to="/guilds" replace />;
  return <>{children}</>;
}

/**
 * PublicRoute — for /login and /register.
 * If already logged in, redirect to the appropriate dashboard.
 * If loading, show nothing (avoids flash).
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, authenticating, transitioning } = useAuth();
  if (isLoading || authenticating || transitioning) return null;
  if (user) return <Navigate to={user.role === 'ROLE_GUILDMASTER' ? '/admin' : '/guilds'} replace />;
  return <>{children}</>;
}

/**
 * LandingRoute — for the root "/" path.
 * If already logged in, redirect to dashboard.
 * If loading, show nothing.
 * Otherwise show the landing page.
 */
function LandingRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, authenticating } = useAuth();
  if (isLoading || authenticating) return null;
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
          {/* Landing page — shown to logged-out visitors at "/" */}
          <Route path="/" element={<LandingRoute><Landing /></LandingRoute>} />

          {/* Auth pages */}
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Google OAuth2 callback — no auth wrapper, handled internally */}
          <Route path="/auth/google/success" element={<GoogleCallback />} />

          {/* Onboarding */}
          <Route path="/skills" element={<PrivateRoute><SkillsSelection /></PrivateRoute>} />

          {/* Profile */}
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

          {/* Guilds */}
          <Route path="/guilds"          element={<PrivateRoute><Guilds /></PrivateRoute>} />
          <Route path="/guilds/browse"   element={<PrivateRoute><BrowseGuilds /></PrivateRoute>} />
          <Route path="/guilds/:guildId" element={<PrivateRoute><GuildDashboard /></PrivateRoute>} />

          {/* Quests */}
          <Route path="/quests/commissioned" element={<PrivateRoute><CommissionedQuests /></PrivateRoute>} />
          <Route path="/quests/accepted"     element={<PrivateRoute><AcceptedQuests /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin"               element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users/:userId" element={<AdminRoute><UserProfileView /></AdminRoute>} />

          {/* Chat */}
          <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />

          {/* Legacy redirect */}
          <Route path="/dashboard" element={<Navigate to="/guilds" replace />} />

          {/* Catch-all — send unknown routes to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/payment/success" element={<PrivateRoute><PaymentSuccess /></PrivateRoute>} />
          <Route path="/payment/cancel"  element={<PrivateRoute><PaymentCancel /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
