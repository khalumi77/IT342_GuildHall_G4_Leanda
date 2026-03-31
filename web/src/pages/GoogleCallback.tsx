// src/pages/GoogleCallback.tsx
//
// The backend redirects here after completing the server-side OAuth2 flow:
//   /auth/google/success?token=<JWT>&newUser=true|false
//
// This page reads the token from the URL, stores it, hydrates the user
// from /auth/me, then navigates to the correct post-login destination.
// The frontend never communicated with Google at any point.

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokenFromCallback } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token   = searchParams.get('token');
    const newUser = searchParams.get('newUser') === 'true';
    const error   = searchParams.get('error');

    if (error) {
      setErrorMsg(decodeURIComponent(error));
      return;
    }

    if (!token) {
      setErrorMsg('No token received from server.');
      return;
    }

    // Store the JWT and hydrate the user state
    setTokenFromCallback(token).then(user => {
      if (!user) { setErrorMsg('Failed to load user profile.'); return; }
      if (user.role === 'ROLE_GUILDMASTER') { navigate('/admin', { replace: true }); return; }
      if (newUser) { navigate('/skills', { replace: true }); return; }
      navigate('/guilds', { replace: true });
    });
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  if (errorMsg) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>⚠️</div>
          <div style={styles.errorTitle}>Google Sign-In Failed</div>
          <div style={styles.errorMsg}>{errorMsg}</div>
          <button style={styles.btn} onClick={() => navigate('/login')}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.spinner}>📜</div>
        <div style={styles.loadingText}>Completing sign-in...</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f5f5f5', fontFamily: "'Prompt', sans-serif",
  },
  card: {
    backgroundColor: '#fff', borderRadius: '16px', padding: '40px 32px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '360px', width: '100%',
  },
  spinner: { fontSize: '48px', marginBottom: '16px', animation: 'spin 1s linear infinite' },
  loadingText: { color: '#666', fontSize: '15px', fontWeight: 500 },
  errorIcon: { fontSize: '40px', marginBottom: '12px' },
  errorTitle: { fontWeight: 700, fontSize: '18px', color: '#c73434', marginBottom: '8px' },
  errorMsg: { color: '#666', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' },
  btn: {
    backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '20px',
    padding: '10px 24px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer',
  },
};