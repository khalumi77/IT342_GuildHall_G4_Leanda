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
  questCount: number;
  isMember: boolean;
}

export default function BrowseGuilds() {
  const navigate = useNavigate();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Join confirmation modal state
  const [joinTarget, setJoinTarget] = useState<Guild | null>(null);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  useEffect(() => {
    api.get('/guilds')
      .then(res => {
        const data = res.data?.data ?? res.data;
        setGuilds(Array.isArray(data) ? data : []);
      })
      .catch(() => setGuilds([]))
      .finally(() => setIsLoading(false));
  }, []);

  const handleJoinConfirm = async () => {
    if (!joinTarget) return;
    setJoiningId(joinTarget.id);
    try {
      await api.post(`/guilds/${joinTarget.id}/join`);
      setGuilds(prev =>
        prev.map(g => g.id === joinTarget.id
          ? { ...g, isMember: true, memberCount: g.memberCount + 1 }
          : g
        )
      );
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to join guild.';
      alert(msg);
    } finally {
      setJoiningId(null);
      setJoinTarget(null);
    }
  };

  const filtered = guilds.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.description.toLowerCase().includes(search.toLowerCase())
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
            {search ? 'No guilds match your search.' : 'No guilds available yet.'}
          </div>
        ) : (
          <div style={styles.list}>
            {filtered.map(guild => (
              <BrowseGuildCard
                key={guild.id}
                guild={guild}
                isJoining={joiningId === guild.id}
                onJoinClick={() => setJoinTarget(guild)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Join Confirmation Modal */}
      {joinTarget && (
        <div style={styles.overlay} onClick={() => { if (joiningId === null) setJoinTarget(null); }}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            {/* Guild name banner */}
            <div style={styles.modalGuildBanner}>
              <div style={styles.modalGuildIcon}>⚔️</div>
              <div style={styles.modalGuildName}>{joinTarget.name}</div>
            </div>

            <div style={styles.modalBody}>
              {joinTarget.description ? (
                <p style={styles.modalDescription}>{joinTarget.description}</p>
              ) : (
                <p style={styles.modalDescriptionEmpty}>No description provided.</p>
              )}

              <div style={styles.modalStats}>
                <span style={styles.modalStat}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  {joinTarget.memberCount} members
                </span>
                <span style={styles.modalStat}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {joinTarget.questCount} active quests
                </span>
              </div>

              <p style={styles.modalQuestion}>
                Would you like to join this guild?
              </p>
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => setJoinTarget(null)}
                disabled={joiningId !== null}
              >
                Cancel
              </button>
              <button
                style={{
                  ...styles.joinBtn,
                  opacity: joiningId !== null ? 0.7 : 1,
                  cursor: joiningId !== null ? 'not-allowed' : 'pointer',
                }}
                onClick={handleJoinConfirm}
                disabled={joiningId !== null}
              >
                {joiningId !== null ? 'Joining...' : 'Join Guild'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BrowseGuildCard({
  guild, isJoining, onJoinClick,
}: {
  guild: Guild;
  isJoining: boolean;
  onJoinClick: () => void;
}) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLeft}>
        <span style={styles.cardName}>{guild.name}</span>
        {guild.description && (
          <span style={styles.cardDesc}>{guild.description}</span>
        )}
      </div>

      <div style={styles.cardStats}>
        {/* Members */}
        <span style={styles.statItem}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span style={styles.statNum}>{guild.memberCount}</span>
        </span>
        {/* Quests */}
        <span style={styles.statItem}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
          </svg>
          <span style={styles.statNum}>{guild.questCount}</span>
        </span>
      </div>

      {!guild.isMember ? (
        <button
          style={{
            ...styles.joinBtn,
            opacity: isJoining ? 0.7 : 1,
            cursor: isJoining ? 'not-allowed' : 'pointer',
          }}
          onClick={onJoinClick}
          disabled={isJoining}
        >
          {isJoining ? '...' : 'Join'}
        </button>
      ) : (
        <span style={styles.joinedBadge}>Joined ✓</span>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: "'Prompt', sans-serif" },
  main: { maxWidth: '600px', margin: '0 auto', padding: '32px 24px' },
  header: { marginBottom: '20px' },
  titleRow: { display: 'flex', alignItems: 'center', marginBottom: '14px' },
  title: { color: '#34C759', fontWeight: 700, fontSize: '26px', margin: 0 },
  searchRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  searchWrap: { position: 'relative', display: 'flex', alignItems: 'center', flex: 1 },
  searchIcon: { position: 'absolute', left: '12px', pointerEvents: 'none' },
  searchInput: { width: '100%', padding: '10px 14px 10px 36px', border: '1.5px solid #ddd', borderRadius: '10px', fontFamily: "'Prompt', sans-serif", fontSize: '14px', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' as const },
  filterBtn: { background: 'none', border: '1.5px solid #ddd', borderRadius: '10px', padding: '9px 12px', cursor: 'not-allowed', display: 'flex', alignItems: 'center', opacity: 0.5, backgroundColor: '#fff' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  card: { backgroundColor: '#DDFFBC', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '16px' },
  cardLeft: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  cardName: { fontWeight: 700, fontSize: '15px', color: '#222' },
  cardDesc: { fontSize: '12px', color: '#666', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' },
  cardStats: { display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 },
  statItem: { display: 'flex', alignItems: 'center', gap: '5px' },
  statNum: { fontWeight: 700, fontSize: '14px', color: '#333' },
  joinBtn: { backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '20px', padding: '6px 18px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0, transition: 'filter 0.15s' },
  joinedBadge: { color: '#52734D', fontWeight: 600, fontSize: '13px', flexShrink: 0 },
  empty: { color: '#888', fontSize: '15px', textAlign: 'center', marginTop: '48px' },

  // Modal
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '24px' },
  modal: { backgroundColor: '#fff', borderRadius: '20px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' },
  modalGuildBanner: { backgroundColor: '#52734D', padding: '24px 24px 20px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '8px' },
  modalGuildIcon: { fontSize: '32px' },
  modalGuildName: { color: '#fff', fontWeight: 700, fontSize: '20px', textAlign: 'center' as const },
  modalBody: { padding: '20px 24px 8px' },
  modalDescription: { margin: '0 0 14px', fontSize: '14px', color: '#444', lineHeight: '1.6', textAlign: 'center' as const },
  modalDescriptionEmpty: { margin: '0 0 14px', fontSize: '14px', color: '#aaa', fontStyle: 'italic', textAlign: 'center' as const },
  modalStats: { display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px' },
  modalStat: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#666', fontWeight: 500 },
  modalQuestion: { textAlign: 'center' as const, fontWeight: 600, fontSize: '15px', color: '#222', margin: '0 0 4px' },
  modalActions: { display: 'flex', gap: '10px', padding: '16px 24px 24px', justifyContent: 'center' },
  cancelBtn: { background: 'none', border: '1.5px solid #ddd', borderRadius: '20px', padding: '9px 24px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '14px', color: '#666', cursor: 'pointer' },
};