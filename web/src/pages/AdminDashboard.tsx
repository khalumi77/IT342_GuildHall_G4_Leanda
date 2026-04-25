// src/pages/AdminDashboard.tsx
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

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  level: number;
  xp: number;
  rank: string;
  profilePictureUrl?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'guilds' | 'adventurers'>('guilds');
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalGuilds, setTotalGuilds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  // Refs for each context menu so the global mousedown doesn't close them prematurely
  const guildMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [showCreateGuild, setShowCreateGuild] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Guild | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [createError, setCreateError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [guildMenuId, setGuildMenuId] = useState<number | null>(null);
  const [userMenuId, setUserMenuId] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Close guild context menu ONLY if the click is outside the menu itself
      if (guildMenuRef.current && !guildMenuRef.current.contains(e.target as Node)) {
        setGuildMenuId(null);
      }
      // Close user context menu ONLY if the click is outside the menu itself
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [guildsRes, usersRes] = await Promise.allSettled([
        api.get('/admin/guilds'),
        api.get('/admin/users'),
      ]);

      if (guildsRes.status === 'fulfilled') {
        const raw = guildsRes.value.data;
        const list: Guild[] = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        setGuilds(list);
        setTotalGuilds(list.length);
      }

      if (usersRes.status === 'fulfilled') {
        const raw = usersRes.value.data;
        const list: User[] = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        setUsers(list);
        setTotalUsers(list.length);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGuild = async (guild: Guild) => {
    if (!window.confirm(`Delete "${guild.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/guilds/${guild.id}`);
      setGuilds(prev => prev.filter(g => g.id !== guild.id));
      setTotalGuilds(n => n - 1);
    } catch { alert('Failed to delete guild.'); }
    setGuildMenuId(null);
  };

  const openRenameModal = (guild: Guild) => {
    // Set state synchronously before closing the menu
    setRenameTarget(guild);
    setRenameValue(guild.name);
    setGuildMenuId(null);
    // Small timeout ensures state is set before modal renders
    setTimeout(() => setShowRenameModal(true), 0);
  };

  const handleRenameGuild = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setIsSaving(true);
    try {
      await api.put(`/admin/guilds/${renameTarget.id}`, { name: renameValue.trim() });
      setGuilds(prev => prev.map(g => g.id === renameTarget!.id ? { ...g, name: renameValue.trim() } : g));
      setShowRenameModal(false);
      setRenameTarget(null);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to rename guild.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBanUser = async (u: User) => {
    if (!window.confirm(`Ban "${u.username}"? They will no longer be able to log in.`)) return;
    try {
      await api.post(`/admin/users/${u.id}/ban`, { reason: 'Banned by Guildmaster' });
      setUsers(prev => prev.filter(usr => usr.id !== u.id));
      setTotalUsers(n => n - 1);
    } catch { alert('Failed to ban user.'); }
    setUserMenuId(null);
  };

  const handleCreateGuild = async () => {
    if (!createForm.name.trim()) { setCreateError('Guild name is required.'); return; }
    setIsSaving(true);
    setCreateError('');
    try {
      const res = await api.post('/admin/guilds', createForm);
      const raw = res.data;
      const newGuild = raw?.data ?? raw;
      setGuilds(prev => [...prev, { id: newGuild.id, name: newGuild.name, description: newGuild.description ?? '', memberCount: newGuild.memberCount ?? 1, questCount: newGuild.questCount ?? 0 }]);
      setTotalGuilds(n => n + 1);
      setShowCreateGuild(false);
      setCreateForm({ name: '', description: '' });
    } catch (err: any) {
      setCreateError(err?.response?.data?.error?.message || 'Failed to create guild.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <Navbar />

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.pageTitle}>Admin Dashboard</h1>
            {/* Switch to adventurer view */}
            <button style={styles.switchBtn} onClick={() => navigate('/guilds')}>
              ⚔️ Switch to Adventurer View
            </button>
          </div>
          <button style={styles.createBtn} onClick={() => { setCreateForm({ name: '', description: '' }); setCreateError(''); setShowCreateGuild(true); }}>
            + Create Guild
          </button>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{isLoading ? '—' : totalUsers}</div>
            <div style={styles.statLabel}>GuildHall Users</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{isLoading ? '—' : totalGuilds}</div>
            <div style={styles.statLabel}>Active Guilds</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabRow}>
          <button style={{ ...styles.tab, ...(activeTab === 'guilds' ? styles.tabActive : {}) }} onClick={() => setActiveTab('guilds')}>Guild List</button>
          <button style={{ ...styles.tab, ...(activeTab === 'adventurers' ? styles.tabActive : {}) }} onClick={() => setActiveTab('adventurers')}>Adventurer List</button>
        </div>

        {isLoading ? <div style={styles.empty}>Loading...</div>
        : activeTab === 'guilds' ? (
          <div style={styles.list}>
            {guilds.length === 0 ? <div style={styles.empty}>No guilds yet.</div>
            : guilds.map(guild => (
              <div key={guild.id} style={{ ...styles.card, cursor: 'pointer' }} onClick={() => navigate(`/guilds/${guild.id}`)}>
                <span style={styles.cardName}>{guild.name}</span>
                <div style={styles.cardStats}>
                  <span style={styles.statItem}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span style={styles.statNum}>{guild.memberCount}</span>
                  </span>
                  <span style={styles.statItem}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span style={styles.statNum}>{guild.questCount}</span>
                  </span>
                </div>
                {/* Guild context menu — uses guildMenuRef to prevent premature close */}
                <div style={{ position: 'relative' }} ref={guildMenuId === guild.id ? guildMenuRef : undefined}>
                  <button style={styles.menuBtn} onClick={e => { e.stopPropagation(); setGuildMenuId(id => id === guild.id ? null : guild.id); }}>
                    <span style={styles.dotMenu}>···</span>
                  </button>
                  {guildMenuId === guild.id && (
                    <div style={styles.contextMenu}>
                      <button style={styles.contextItem} onClick={() => openRenameModal(guild)}>Rename Guild</button>
                      <button style={{ ...styles.contextItem, color: '#c73434' }} onClick={() => handleDeleteGuild(guild)}>Delete Guild</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.list}>
            {users.length === 0 ? <div style={styles.empty}>No adventurers found.</div>
            : users.map(u => (
              <div key={u.id} style={{ ...styles.card, cursor: 'pointer' }} onClick={() => navigate(`/admin/users/${u.id}`)}>
                <div style={styles.userInfo}>
                  {/* Profile picture or initial */}
                  {u.profilePictureUrl ? (
                    <img src={u.profilePictureUrl} alt={u.username} style={styles.userAvatarImg} />
                  ) : (
                    <div style={styles.userAvatar}>{u.username?.[0]?.toUpperCase() ?? '?'}</div>
                  )}
                  <div>
                    <div style={styles.userName}>{u.username}</div>
                    <div style={styles.userEmail}>{u.email}</div>
                  </div>
                </div>
                <div style={styles.cardStats}>
                  <span style={styles.rankBadge}>{u.rank ?? 'Bronze'}</span>
                  <span style={styles.levelText}>Lv. {u.level}</span>
                </div>
                {/* User context menu */}
                <div style={{ position: 'relative' }} ref={userMenuId === u.id ? userMenuRef : undefined}>
                  <button style={styles.menuBtn} onClick={e => { e.stopPropagation(); setUserMenuId(id => id === u.id ? null : u.id); }}>
                    <span style={styles.dotMenu}>···</span>
                  </button>
                  {userMenuId === u.id && (
                    <div style={styles.contextMenu}>
                      <button style={{ ...styles.contextItem, color: '#c73434' }} onClick={() => handleBanUser(u)}>Ban User</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Guild Modal */}
      {showCreateGuild && (
        <div style={styles.overlay} onClick={() => setShowCreateGuild(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Create Guild</h2>
              <button style={styles.closeBtn} onClick={() => setShowCreateGuild(false)}>✕</button>
            </div>
            {createError && <div style={styles.errorBox}>{createError}</div>}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Guild Name</label>
              <input style={styles.input} placeholder="Enter guild name" value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} maxLength={50} />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Description</label>
              <textarea style={styles.textarea} placeholder="Describe this guild's purpose..."
                value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} rows={3} maxLength={300} />
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowCreateGuild(false)}>Cancel</button>
              <button style={{ ...styles.submitBtn, opacity: isSaving ? 0.7 : 1 }} onClick={handleCreateGuild} disabled={isSaving}>
                {isSaving ? 'Creating...' : 'Create Guild'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Guild Modal */}
      {showRenameModal && renameTarget && (
        <div style={styles.overlay} onClick={() => { setShowRenameModal(false); }}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Rename Guild</h2>
              <button style={styles.closeBtn} onClick={() => setShowRenameModal(false)}>✕</button>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>New Name for "{renameTarget.name}"</label>
              <input style={styles.input} value={renameValue} onChange={e => setRenameValue(e.target.value)}
                maxLength={50} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleRenameGuild(); }} />
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowRenameModal(false)}>Cancel</button>
              <button style={{ ...styles.submitBtn, opacity: isSaving || !renameValue.trim() ? 0.7 : 1 }}
                onClick={handleRenameGuild} disabled={isSaving || !renameValue.trim()}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: "'Prompt', sans-serif" },
  nav: { backgroundColor: '#52734D', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' },
  logoBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' },
  logoText: { color: '#fff', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '20px', letterSpacing: '-0.3px' },
  adminBadge: { backgroundColor: '#DDFFBC', color: '#52734D', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.5px' },
  rightIcons: { display: 'flex', alignItems: 'center', gap: '4px' },
  iconBtn: { background: 'none', border: 'none', cursor: 'not-allowed', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', opacity: 0.5 },
  profileBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', transition: 'background 0.15s' },
  dropdown: { position: 'absolute', top: 'calc(100% + 8px)', right: 0, backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '210px', overflow: 'hidden', padding: '8px 0', zIndex: 200 },
  dropdownProfileBtn: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const, transition: 'background 0.1s' },
  avatarImg: { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' as const, border: '2px solid #DDFFBC', flexShrink: 0 },
  avatarCircle: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#52734D', color: '#fff', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dropdownUsername: { fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '14px', color: '#222' },
  dropdownRank: { fontFamily: "'Prompt', sans-serif", fontSize: '12px', color: '#888' },
  dropdownDivider: { height: '1px', backgroundColor: '#f0f0f0', margin: '4px 0' },
  dropdownItem: { display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left' as const, fontFamily: "'Prompt', sans-serif", fontSize: '14px', color: '#333', cursor: 'pointer', transition: 'background 0.1s' },

  main: { maxWidth: '700px', margin: '0 auto', padding: '32px 24px' },
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' },
  pageTitle: { color: '#34C759', fontWeight: 700, fontSize: '28px', margin: '0 0 6px' },
  switchBtn: { background: 'none', border: '1.5px solid #52734D', borderRadius: '20px', padding: '5px 14px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '12px', color: '#52734D', cursor: 'pointer', transition: 'filter 0.15s' },
  createBtn: { backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 20px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'filter 0.15s', flexShrink: 0 },

  statsRow: { display: 'flex', gap: '16px', marginBottom: '28px' },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: '14px', padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #eee' },
  statValue: { fontSize: '36px', fontWeight: 700, color: '#34C759', lineHeight: 1 },
  statLabel: { fontSize: '14px', color: '#666', marginTop: '6px', fontWeight: 500 },

  tabRow: { display: 'flex', marginBottom: '0', borderBottom: '2px solid #eee' },
  tab: { background: 'none', border: 'none', padding: '10px 20px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '14px', color: '#888', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-2px', transition: 'color 0.15s' },
  tabActive: { color: '#34C759', borderBottom: '2px solid #34C759' },

  list: { display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '12px' },
  empty: { color: '#888', fontSize: '15px', textAlign: 'center', marginTop: '48px' },
  card: { backgroundColor: '#DDFFBC', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '16px' },
  cardName: { flex: 1, fontWeight: 700, fontSize: '15px', color: '#222' },
  cardStats: { display: 'flex', alignItems: 'center', gap: '16px' },
  statItem: { display: 'flex', alignItems: 'center', gap: '5px' },
  statNum: { fontWeight: 700, fontSize: '14px', color: '#333' },
  menuBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', lineHeight: 1 },
  dotMenu: { fontSize: '18px', fontWeight: 700, color: '#555', letterSpacing: '1px' },
  contextMenu: { position: 'absolute', top: 'calc(100% + 4px)', right: 0, backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', boxShadow: '0 6px 20px rgba(0,0,0,0.1)', minWidth: '160px', padding: '6px 0', zIndex: 50 },
  contextItem: { display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left' as const, fontFamily: "'Prompt', sans-serif", fontSize: '14px', color: '#333', cursor: 'pointer' },

  userInfo: { flex: 1, display: 'flex', alignItems: 'center', gap: '12px' },
  userAvatarImg: { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' as const, border: '2px solid #52734D', flexShrink: 0 },
  userAvatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#52734D', color: '#fff', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userName: { fontWeight: 700, fontSize: '14px', color: '#222' },
  userEmail: { fontSize: '12px', color: '#666', marginTop: '1px' },
  rankBadge: { backgroundColor: '#52734D', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' },
  levelText: { fontSize: '13px', fontWeight: 600, color: '#555' },

  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '24px' },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  modalTitle: { color: '#34C759', fontWeight: 700, fontSize: '22px', margin: 0 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', padding: '4px', borderRadius: '6px' },
  fieldGroup: { marginBottom: '16px' },
  label: { display: 'block', color: '#52734D', fontWeight: 600, fontSize: '13px', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', fontFamily: "'Prompt', sans-serif", outline: 'none', boxSizing: 'border-box' as const },
  textarea: { width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', fontFamily: "'Prompt', sans-serif", outline: 'none', boxSizing: 'border-box' as const, resize: 'vertical' as const },
  errorBox: { backgroundColor: '#ffe5e5', color: '#c73434', border: '1px solid #f5c6c6', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' },
  cancelBtn: { background: 'none', border: '1.5px solid #ddd', borderRadius: '20px', padding: '8px 20px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '14px', color: '#666', cursor: 'pointer' },
  submitBtn: { backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 20px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
};