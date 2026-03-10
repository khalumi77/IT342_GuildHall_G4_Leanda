// src/pages/Guilds.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/authApi';

interface Guild {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  questCount: number;
}

export default function Guilds() {
  const navigate = useNavigate();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch user's guilds from backend
    api.get('/guilds/my')
      .then(res => {
        const data = res.data?.data ?? res.data;
        setGuilds(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Fallback: show Global Square as placeholder until backend endpoint exists
        setGuilds([
          { id: 1, name: 'Global Square', description: 'The default community for all adventurers.', memberCount: 1, questCount: 0 },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Close context menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLeaveGuild = async (guildId: number) => {
    if (!window.confirm('Are you sure you want to leave this guild?')) return;
    try {
      await api.delete(`/guilds/${guildId}/leave`);
      setGuilds(prev => prev.filter(g => g.id !== guildId));
    } catch {
      alert('Failed to leave guild. Please try again.');
    }
    setOpenMenuId(null);
  };

  const filtered = guilds.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>
      <Navbar />

      <main style={styles.main}>
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <h2 style={styles.title}>My Guilds</h2>
            <button
              style={styles.browseBtn}
              onClick={() => navigate('/guilds/browse')}
            >
              Browse more guilds
            </button>
          </div>
          <div style={styles.searchWrap}>
            <svg style={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              style={styles.searchInput}
              placeholder="Search guilds"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={styles.empty}>Loading your guilds...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>
            {search ? 'No guilds match your search.' : 'You have not joined any guilds yet.'}
          </div>
        ) : (
          <div style={styles.list}>
            {filtered.map(guild => (
              <GuildCard
                key={guild.id}
                guild={guild}
                isMenuOpen={openMenuId === guild.id}
                onMenuToggle={() => setOpenMenuId(id => id === guild.id ? null : guild.id)}
                onLeave={() => handleLeaveGuild(guild.id)}
                menuRef={menuRef}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function GuildCard({
  guild, isMenuOpen, onMenuToggle, onLeave, menuRef,
}: {
  guild: Guild;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onLeave: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div style={styles.card}>
      <span style={styles.cardName}>{guild.name}</span>

      <div style={styles.cardStats}>
        {/* Members */}
        <span style={styles.statItem}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span style={styles.statNum}>{guild.memberCount}</span>
        </span>

        {/* Quests */}
        <span style={styles.statItem}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span style={styles.statNum}>{guild.questCount}</span>
        </span>
      </div>

      {/* Three-dot menu */}
      <div style={{ position: 'relative' }} ref={menuRef}>
        <button style={styles.menuBtn} onClick={onMenuToggle} title="Options">
          <span style={styles.dotMenu}>···</span>
        </button>
        {isMenuOpen && (
          <div style={styles.contextMenu}>
            <button
              style={{ ...styles.contextItem, color: '#c73434' }}
              onClick={onLeave}
            >
              Leave Guild
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: "'Prompt', sans-serif",
  },
  main: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  header: {
    marginBottom: '20px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '14px',
    flexWrap: 'wrap',
  },
  title: {
    color: '#34C759',
    fontWeight: 700,
    fontSize: '26px',
    margin: 0,
  },
  browseBtn: {
    backgroundColor: '#DDFFBC',
    color: '#52734D',
    border: 'none',
    borderRadius: '20px',
    padding: '6px 16px',
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'filter 0.15s',
  },
  searchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px 10px 36px',
    border: '1.5px solid #ddd',
    borderRadius: '10px',
    fontFamily: "'Prompt', sans-serif",
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  card: {
    backgroundColor: '#DDFFBC',
    borderRadius: '12px',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  cardName: {
    flex: 1,
    fontWeight: 700,
    fontSize: '15px',
    color: '#222',
  },
  cardStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  statNum: {
    fontWeight: 700,
    fontSize: '14px',
    color: '#333',
  },
  menuBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    lineHeight: 1,
  },
  dotMenu: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#555',
    letterSpacing: '1px',
  },
  contextMenu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    backgroundColor: '#fff',
    border: '1px solid #e8e8e8',
    borderRadius: '10px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
    minWidth: '150px',
    padding: '6px 0',
    zIndex: 50,
  },
  contextItem: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    fontFamily: "'Prompt', sans-serif",
    fontSize: '14px',
    cursor: 'pointer',
  },
  empty: {
    color: '#888',
    fontSize: '15px',
    textAlign: 'center',
    marginTop: '48px',
  },
};