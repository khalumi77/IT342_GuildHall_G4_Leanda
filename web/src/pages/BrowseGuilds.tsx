// src/pages/BrowseGuilds.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/authApi';

interface Guild {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  isMember: boolean;
}

export default function BrowseGuilds() {
  const navigate = useNavigate();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  useEffect(() => {
    api.get('/guilds')
      .then(res => {
        const data = res.data?.data ?? res.data;
        setGuilds(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Fallback placeholder data until backend endpoint exists
        setGuilds([
          { id: 2, name: "Artists' Guild", description: 'For creative adventurers.', memberCount: 500, isMember: false },
          { id: 3, name: 'Tutoring Guild', description: 'Share knowledge, earn XP.', memberCount: 50, isMember: false },
          { id: 4, name: "Voice Actor's Guild", description: 'The guild for performers.', memberCount: 20, isMember: false },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleJoin = async (guild: Guild) => {
    if (guild.isMember) return;
    setJoiningId(guild.id);
    try {
      await api.post(`/guilds/${guild.id}/join`);
      setGuilds(prev =>
        prev.map(g => g.id === guild.id ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g)
      );
    } catch {
      alert('Failed to join guild. Please try again.');
    } finally {
      setJoiningId(null);
    }
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
            <h2 style={styles.title}>Browse Guilds</h2>
          </div>
          <div style={styles.searchRow}>
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
            {/* Filter icon placeholder — not implemented */}
            <button style={styles.filterBtn} disabled title="Filter (coming soon)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={styles.empty}>Loading guilds...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>
            {search ? 'No guilds match your search.' : 'No guilds available.'}
          </div>
        ) : (
          <div style={styles.list}>
            {filtered.map(guild => (
              <BrowseGuildCard
                key={guild.id}
                guild={guild}
                isJoining={joiningId === guild.id}
                onJoin={() => handleJoin(guild)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function BrowseGuildCard({
  guild, isJoining, onJoin,
}: {
  guild: Guild;
  isJoining: boolean;
  onJoin: () => void;
}) {
  return (
    <div style={styles.card}>
      <span style={styles.cardName}>{guild.name}</span>

      <div style={styles.cardStats}>
        <span style={styles.statItem}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span style={styles.statNum}>{guild.memberCount}</span>
        </span>
      </div>

      {!guild.isMember ? (
        <button
          style={{
            ...styles.joinBtn,
            opacity: isJoining ? 0.7 : 1,
            cursor: isJoining ? 'not-allowed' : 'pointer',
          }}
          onClick={onJoin}
          disabled={isJoining}
        >
          {isJoining ? '...' : 'Join'}
        </button>
      ) : (
        <span style={styles.joinedBadge}>Joined ✓</span>
      )}

      {/* Three-dot placeholder (no action for browse view) */}
      <button style={styles.menuBtn} title="Options (coming soon)" disabled>
        <span style={styles.dotMenu}>···</span>
      </button>
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
    marginBottom: '14px',
  },
  title: {
    color: '#34C759',
    fontWeight: 700,
    fontSize: '26px',
    margin: 0,
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  searchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1,
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
  filterBtn: {
    background: 'none',
    border: '1.5px solid #ddd',
    borderRadius: '10px',
    padding: '9px 12px',
    cursor: 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    opacity: 0.5,
    backgroundColor: '#fff',
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
  joinBtn: {
    backgroundColor: '#34C759',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    padding: '6px 18px',
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'filter 0.15s',
  },
  joinedBadge: {
    color: '#52734D',
    fontWeight: 600,
    fontSize: '13px',
    flexShrink: 0,
  },
  menuBtn: {
    background: 'none',
    border: 'none',
    cursor: 'not-allowed',
    padding: '4px 8px',
    borderRadius: '6px',
    lineHeight: 1,
    opacity: 0.5,
  },
  dotMenu: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#555',
    letterSpacing: '1px',
  },
  empty: {
    color: '#888',
    fontSize: '15px',
    textAlign: 'center',
    marginTop: '48px',
  },
};