// src/components/Navbar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isGuildmaster = user?.role === 'ROLE_GUILDMASTER';
  const homePath = isGuildmaster ? '/admin' : '/guilds';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const go = (path: string) => { setProfileOpen(false); navigate(path); };
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav style={styles.nav}>
      <button style={styles.logoBtn} onClick={() => navigate(homePath)}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
          <rect x="2" y="1" width="11" height="16" rx="1.5" fill="white"/>
          <polygon points="2,17 7.5,13.5 13,17 13,17 13,1 2,1" fill="white"/>
          <rect x="4" y="4" width="5" height="1.5" rx="0.75" fill="#52734D"/>
          <rect x="4" y="7" width="7" height="1.5" rx="0.75" fill="#52734D"/>
          <rect x="4" y="10" width="6" height="1.5" rx="0.75" fill="#52734D"/>
          <rect x="14" y="0" width="6" height="10" rx="1" fill="white"/>
          <polygon points="14,10 17,8 20,10" fill="#52734D"/>
        </svg>
        <span style={styles.logoText}>GuildHall</span>
        {isGuildmaster && <span style={styles.adminBadge}>Admin</span>}
      </button>

      <div style={styles.rightIcons}>
        <button style={styles.iconBtn} title="Chat (coming soon)" disabled>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>

        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button style={styles.profileBtn} onClick={() => setProfileOpen(o => !o)} title="Profile">
            {user?.profilePictureUrl ? (
              <img src={user.profilePictureUrl} alt="avatar" style={styles.navAvatar} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            )}
          </button>

          {profileOpen && (
            <div style={styles.dropdown}>
              {/* Profile header — click → /profile */}
              <button style={styles.dropdownProfileBtn} onClick={() => go('/profile')}>
                {user?.profilePictureUrl ? (
                  <img src={user.profilePictureUrl} alt="avatar" style={styles.avatarImg} />
                ) : (
                  <div style={styles.avatarCircle}>
                    {user?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <div style={styles.profileInfo}>
                  <div style={styles.dropdownUsername}>{user?.username}</div>
                  <div style={styles.dropdownRank}>{user?.rank ?? 'Bronze'}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              <div style={styles.dropdownDivider} />

              {isGuildmaster ? (
                <>
                  <button style={styles.dropdownItem} onClick={() => go('/admin')}>Admin Dashboard</button>
                  <button style={styles.dropdownItem} onClick={() => go('/guilds')}>Adventurer Dashboard</button>
                </>
              ) : (
                <button style={styles.dropdownItem} onClick={() => go('/guilds')}>Communities</button>
              )}

              <button style={styles.dropdownItem} onClick={() => go('/quests/commissioned')}>
                Commissioned Quests
              </button>

              <button style={styles.dropdownItem} onClick={() => go('/quests/accepted')}>
                Accepted Quests
              </button>

              <div style={styles.dropdownDivider} />

              <button style={{ ...styles.dropdownItem, color: '#c73434' }} onClick={handleLogout}>
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
    backgroundColor: '#52734D', height: '56px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0,
    zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
  },
  logoBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' },
  logoText: { color: '#fff', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '20px', letterSpacing: '-0.3px' },
  adminBadge: { backgroundColor: '#DDFFBC', color: '#52734D', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.5px' },
  rightIcons: { display: 'flex', alignItems: 'center', gap: '4px' },
  iconBtn: { background: 'none', border: 'none', cursor: 'not-allowed', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', opacity: 0.5 },
  profileBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', transition: 'background 0.15s' },
  navAvatar: { width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' as const, border: '2px solid #DDFFBC' },

  dropdown: {
    position: 'absolute', top: 'calc(100% + 8px)', right: 0, backgroundColor: '#fff',
    border: '1px solid #e8e8e8', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    minWidth: '220px', overflow: 'hidden', padding: '8px 0', zIndex: 200,
  },
  dropdownProfileBtn: {
    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
    padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
    textAlign: 'left' as const, transition: 'background 0.1s',
  },
  avatarImg: { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' as const, border: '2px solid #DDFFBC', flexShrink: 0 },
  avatarCircle: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#52734D', color: '#fff', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  profileInfo: { flex: 1, textAlign: 'left' as const },
  dropdownUsername: { fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '14px', color: '#222' },
  dropdownRank: { fontFamily: "'Prompt', sans-serif", fontSize: '12px', color: '#888' },
  dropdownDivider: { height: '1px', backgroundColor: '#f0f0f0', margin: '4px 0' },
  dropdownItem: {
    display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none',
    textAlign: 'left' as const, fontFamily: "'Prompt', sans-serif", fontSize: '14px', color: '#333',
    cursor: 'pointer', transition: 'background 0.1s',
  },
};