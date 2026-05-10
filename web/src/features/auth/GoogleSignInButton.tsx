// src/components/GoogleSignInButton.tsx
//
// A simple button that redirects the browser to the backend's Google OAuth2
// initiation endpoint. The backend handles the entire flow from here —
// the frontend never communicates with Google directly.

import React from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

interface Props {
  mode?: 'signin' | 'signup';
}

export default function GoogleSignInButton({ mode = 'signin' }: Props) {
  const handleClick = () => {
    // Navigate the browser to the backend — it will redirect to Google
    window.location.href = `${API_BASE}/auth/google/init`;
  };

  return (
    <button style={styles.btn} onClick={handleClick} type="button">
      {/* Google "G" icon */}
      <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      <span>{mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}</span>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    maxWidth: '380px',
    padding: '10px 16px',
    backgroundColor: '#fff',
    border: '1.5px solid #dadce0',
    borderRadius: '4px',
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 600,
    fontSize: '14px',
    color: '#3c4043',
    cursor: 'pointer',
    transition: 'background 0.15s, box-shadow 0.15s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
};