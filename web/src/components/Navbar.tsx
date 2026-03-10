// src/components/Navbar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      {/* Logo — clicking takes you to /guilds (home) */}
      <button style={styles.logoBtn} onClick={() => navigate('/guilds')}>
        {/* Inline SVG recreation of the GuildHall logo icon */}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
          {/* Bookmark/scroll shape */}
          <rect x="2" y="1" width="11" height="16" rx="1.5" fill="white"/>
          <polygon points="2,17 7.5,13.5 13,17 13,17 13,1 2,1" fill="white"/>
          {/* Lines on the scroll */}
          <rect x="4" y="4" width="5" height="1.5" rx="0.75" fill="#52734D"/>
          <rect x="4" y="7" width="7" height="1.5" rx="0.75" fill="#52734D"/>
          <rect x="4" y="10" width="6" height="1.5" rx="0.75" fill="#52734D"/>
          {/* Flag/tab sticking up top-right */}
          <rect x="14" y="0" width="6" height="10" rx="1" fill="white"/>
          <polygon points="14,10 17,8 20,10" fill="#52734D"/>
        </svg>
        <span style={styles.logoText}>GuildHall</span>
      </button>

      {/* Right side icons */}
      <div style={styles.rightIcons}>
        {/* Chat icon (not implemented) */}
        <button style={styles.iconBtn} title="Chat (coming soon)" disabled>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>

        {/* Profile button + dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            style={styles.profileBtn}
            onClick={() => setProfileOpen(o => !o)}
            title="Profile"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>

          {profileOpen && (
            <div style={styles.dropdown}>
              {/* User info */}
              <div style={styles.dropdownHeader}>
                <div style={styles.avatarCircle}>
                  {user?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <div style={styles.dropdownUsername}>{user?.username}</div>
                  <div style={styles.dropdownRank}>{user?.rank ?? 'Bronze'}</div>
                </div>
              </div>
              <div style={styles.dropdownDivider} />
              <button
                style={styles.dropdownItem}
                onClick={() => { setProfileOpen(false); navigate('/guilds'); }}
              >
                Communities
              </button>
              <button
                style={styles.dropdownItem}
                onClick={() => { setProfileOpen(false); /* TODO: navigate to accepted quests */ }}
              >
                Accepted Quests
              </button>
              <div style={styles.dropdownDivider} />
              <button
                style={{ ...styles.dropdownItem, color: '#c73434' }}
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    backgroundColor: '#52734D',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
  },
  logoBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0',
  },
  logoText: {
    color: '#fff',
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 700,
    fontSize: '20px',
    letterSpacing: '-0.3px',
  },
  rightIcons: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'not-allowed',
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    opacity: 0.5,
  },
  profileBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.15s',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    backgroundColor: '#fff',
    border: '1px solid #e8e8e8',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    minWidth: '200px',
    overflow: 'hidden',
    padding: '8px 0',
  },
  dropdownHeader: {
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatarCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#52734D',
    color: '#fff',
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 700,
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dropdownUsername: {
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 600,
    fontSize: '14px',
    color: '#222',
  },
  dropdownRank: {
    fontFamily: "'Prompt', sans-serif",
    fontSize: '12px',
    color: '#888',
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: '#f0f0f0',
    margin: '4px 0',
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    fontFamily: "'Prompt', sans-serif",
    fontSize: '14px',
    color: '#333',
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
};