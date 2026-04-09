// src/pages/CommissionedQuests.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/authApi';

interface CommissionedQuest {
  id: number;
  title: string;
  category: string;
  description: string;
  questType: 'VOLUNTEER' | 'PAID';
  reward: number | null;
  xpReward: number;
  status: 'OPEN' | 'PENDING' | 'COMPLETED' | 'CANCELLED';
  postedBy: string;
  createdAt: string | null;
  attachmentName: string | null;
  guildId: number;
  guildName: string;
  helperUsername: string | null;
  helperId: number | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  OPEN:      { label: 'Open',        color: '#166534', bg: '#dcfce7', dot: '●' },
  PENDING:   { label: 'Pending',     color: '#92400e', bg: '#fef3c7', dot: '◐' },
  COMPLETED: { label: 'Completed',   color: '#1e3a5f', bg: '#dbeafe', dot: '✓' },
  CANCELLED: { label: 'Cancelled',   color: '#6b7280', bg: '#f3f4f6', dot: '✕' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#555', bg: '#eee', dot: '●' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      backgroundColor: cfg.bg, color: cfg.color,
      fontSize: '11px', fontWeight: 700,
      padding: '2px 9px', borderRadius: '20px', letterSpacing: '0.4px',
    }}>
      {cfg.dot}  {cfg.label}
    </span>
  );
}

function QuestIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
      <rect x="4" y="2" width="22" height="32" rx="3" fill="#52734D" opacity="0.9"/>
      <rect x="4" y="2" width="22" height="32" rx="3" stroke="#34C759" strokeWidth="1.5"/>
      <rect x="8" y="8" width="10" height="2.5" rx="1" fill="#DDFFBC"/>
      <rect x="8" y="13" width="14" height="2" rx="1" fill="#DDFFBC" opacity="0.7"/>
      <rect x="8" y="18" width="12" height="2" rx="1" fill="#DDFFBC" opacity="0.7"/>
      <rect x="8" y="23" width="8" height="2" rx="1" fill="#DDFFBC" opacity="0.5"/>
      <rect x="18" y="0" width="14" height="18" rx="2" fill="#34C759"/>
      <polygon points="18,18 25,14 32,18" fill="#52734D"/>
    </svg>
  );
}

export default function CommissionedQuests() {
  const navigate = useNavigate();
  const [quests, setQuests] = useState<CommissionedQuest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CommissionedQuest | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'PENDING' | 'COMPLETED'>('ALL');

  useEffect(() => {
    api.get('/quests/mine')
      .then(res => {
        const data = res.data?.data ?? res.data;
        setQuests(Array.isArray(data) ? data : []);
      })
      .catch(() => setQuests([]))
      .finally(() => setIsLoading(false));
  }, []);

  const handleDelete = async (quest: CommissionedQuest) => {
    setDeletingId(quest.id);
    try {
      await api.delete(`/guilds/${quest.guildId}/quests/${quest.id}`);
      setQuests(prev => prev.filter(q => q.id !== quest.id));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      alert(e?.response?.data?.error?.message || 'Failed to delete quest.');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const handleComplete = async (quest: CommissionedQuest) => {
    if (!window.confirm(`Mark "${quest.title}" as completed? This confirms ${quest.helperUsername} did the work.`)) return;
    setCompletingId(quest.id);
    try {
      const res = await api.post(`/guilds/${quest.guildId}/quests/${quest.id}/complete`);
      const updated = res.data?.data ?? res.data;
      setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, ...updated } : q));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      alert(e?.response?.data?.error?.message || 'Failed to mark quest complete.');
    } finally {
      setCompletingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try { return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return ''; }
  };

  const filtered = quests.filter(q => filter === 'ALL' || q.status === filter);
  const openCount = quests.filter(q => q.status === 'OPEN').length;
  const pendingCount = quests.filter(q => q.status === 'PENDING').length;
  const completedCount = quests.filter(q => q.status === 'COMPLETED').length;

  return (
    <div style={s.page}>
      <Navbar />
      <main style={s.main}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>← Back</button>

        <div style={s.pageHeader}>
          <h1 style={s.pageTitle}>Commissioned Quests</h1>
          <div style={s.pageSubtitle}>Quests you've posted across all guilds</div>
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color: '#166534' }}>{openCount}</div>
            <div style={s.statLabel}>Open</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color: '#92400e' }}>{pendingCount}</div>
            <div style={s.statLabel}>Pending</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color: '#1e3a5f' }}>{completedCount}</div>
            <div style={s.statLabel}>Completed</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={s.tabRow}>
          {(['ALL', 'OPEN', 'PENDING', 'COMPLETED'] as const).map(f => (
            <button key={f} style={{ ...s.tab, ...(filter === f ? s.tabActive : {}) }}
              onClick={() => setFilter(f)}>
              {f === 'ALL' ? `All (${quests.length})` :
               f === 'OPEN' ? `Open (${openCount})` :
               f === 'PENDING' ? `Pending (${pendingCount})` :
               `Completed (${completedCount})`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={s.empty}>Loading your quests...</div>
        ) : filtered.length === 0 ? (
          <div style={s.emptyState}>
            <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: '10px' }}>⚔️</div>
            <div style={s.emptyTitle}>
              {filter === 'ALL' ? 'No quests commissioned yet' : `No ${filter.toLowerCase()} quests`}
            </div>
            <div style={s.emptySubtitle}>
              {filter === 'ALL' ? 'Head to a guild and click "Commission Quest" to post your first quest.' : 'Try switching to a different filter.'}
            </div>
            {filter === 'ALL' && (
              <button style={s.browseBtn} onClick={() => navigate('/guilds')}>
                Go to My Guilds
              </button>
            )}
          </div>
        ) : (
          <div style={s.list}>
            {filtered.map(quest => (
              <div key={quest.id} style={s.card}>
                {/* Left: icon + main info */}
                <div style={s.cardMain} onClick={() => navigate(`/guilds/${quest.guildId}`)}>
                  <QuestIcon size={40} />
                  <div style={s.cardInfo}>
                    <div style={s.cardTitle}>{quest.title}</div>
                    <div style={s.cardMeta}>
                      <span style={s.categoryChip}>{quest.category}</span>
                      <StatusBadge status={quest.status} />
                      <span style={s.guildLink}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                        {quest.guildName}
                      </span>
                      {quest.createdAt && <span style={s.dateMeta}>{formatDate(quest.createdAt)}</span>}
                    </div>

                    {/* Who accepted it */}
                    {quest.helperUsername ? (
                      <div style={s.helperRow}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                        Accepted by <strong style={{ color: '#52734D' }}>{quest.helperUsername}</strong>
                      </div>
                    ) : quest.status === 'OPEN' ? (
                      <div style={s.waitingRow}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Waiting for an adventurer...
                      </div>
                    ) : null}

                    <div style={s.cardDesc}>{quest.description}</div>
                  </div>
                </div>

                {/* Right: reward + actions */}
                <div style={s.cardRight}>
                  <div style={s.rewardSection}>
                    {quest.questType === 'PAID'
                      ? <span style={s.paidText}>₱ {Number(quest.reward).toLocaleString()}</span>
                      : <span style={s.volBadge}>Volunteer</span>}
                    <span style={s.xpText}>+{quest.xpReward} XP</span>
                  </div>

                  {quest.attachmentName && (
                    <div style={s.attachBadge}>
                      {quest.attachmentName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? '🖼️' : '📄'}
                      <span style={s.attachName}>{quest.attachmentName}</span>
                    </div>
                  )}

                  <div style={s.actionBtns}>
                    {/* Mark complete — only for PENDING with a helper */}
                    {quest.status === 'PENDING' && quest.helperUsername && (
                      <button style={{
                        ...s.completeBtn,
                        opacity: completingId === quest.id ? 0.7 : 1,
                        cursor: completingId === quest.id ? 'not-allowed' : 'pointer',
                      }}
                        onClick={() => handleComplete(quest)}
                        disabled={completingId === quest.id}>
                        {completingId === quest.id ? '...' : '✓ Mark Done'}
                      </button>
                    )}

                    {/* Delete — only for OPEN quests */}
                    {quest.status === 'OPEN' && (
                      <button style={{
                        ...s.deleteBtn,
                        opacity: deletingId === quest.id ? 0.6 : 1,
                        cursor: deletingId === quest.id ? 'not-allowed' : 'pointer',
                      }}
                        onClick={() => setConfirmDelete(quest)}
                        disabled={deletingId === quest.id}>
                        {deletingId === quest.id ? '...' : '🗑 Delete'}
                      </button>
                    )}

                    {quest.status === 'COMPLETED' && (
                      <span style={s.completedTag}>Quest Complete ✓</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div style={s.overlay} onClick={() => setConfirmDelete(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Delete Quest?</h2>
            </div>
            <p style={s.modalBody}>
              Are you sure you want to delete <strong>"{confirmDelete.title}"</strong>?
              This action cannot be undone.
            </p>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button style={{
                ...s.confirmDeleteBtn,
                opacity: deletingId === confirmDelete.id ? 0.7 : 1,
              }}
                onClick={() => handleDelete(confirmDelete)}
                disabled={deletingId === confirmDelete.id}>
                {deletingId === confirmDelete.id ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: "'Prompt', sans-serif" },
  main: { maxWidth: '720px', margin: '0 auto', padding: '20px 24px 48px' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#52734D', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '13px', padding: '0 0 4px', display: 'inline-flex', alignItems: 'center' },
  pageHeader: { marginBottom: '20px' },
  pageTitle: { color: '#34C759', fontWeight: 700, fontSize: '28px', margin: '0 0 4px' },
  pageSubtitle: { color: '#888', fontSize: '14px' },

  statsRow: { display: 'flex', gap: '12px', marginBottom: '20px' },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #eee', textAlign: 'center' },
  statNum: { fontSize: '28px', fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: '12px', color: '#888', marginTop: '4px', fontWeight: 500 },

  tabRow: { display: 'flex', borderBottom: '2px solid #eee', marginBottom: '16px', flexWrap: 'wrap' },
  tab: { background: 'none', border: 'none', padding: '10px 14px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '13px', color: '#888', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  tabActive: { color: '#34C759', borderBottom: '2px solid #34C759' },

  empty: { color: '#888', textAlign: 'center', marginTop: '60px', fontSize: '15px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: '10px' },
  emptyTitle: { fontWeight: 700, fontSize: '18px', color: '#555' },
  emptySubtitle: { fontSize: '14px', color: '#aaa', textAlign: 'center', maxWidth: '280px', lineHeight: '1.5' },
  browseBtn: { marginTop: '8px', backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 24px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer' },

  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { backgroundColor: '#DDFFBC', borderRadius: '14px', border: '1.5px solid rgba(82,115,77,0.2)', display: 'flex', alignItems: 'stretch', overflow: 'hidden' },
  cardMain: { display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 18px', flex: 1, cursor: 'pointer', minWidth: 0 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: { fontWeight: 700, fontSize: '15px', color: '#1a1a1a', marginBottom: '6px', lineHeight: '1.3' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' },
  categoryChip: { fontSize: '11px', fontWeight: 600, color: '#52734D', textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: 'rgba(82,115,77,0.15)', padding: '2px 8px', borderRadius: '20px' },
  guildLink: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#52734D' },
  dateMeta: { fontSize: '12px', color: '#888' },
  helperRow: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#555', marginBottom: '4px', backgroundColor: 'rgba(82,115,77,0.1)', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' },
  waitingRow: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#aaa', marginBottom: '4px', fontStyle: 'italic' },
  cardDesc: { fontSize: '13px', color: '#555', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },

  cardRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', padding: '14px 16px', borderLeft: '1px solid rgba(82,115,77,0.15)', backgroundColor: 'rgba(255,255,255,0.35)', minWidth: '140px', flexShrink: 0 },
  rewardSection: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' },
  volBadge: { backgroundColor: '#34C759', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' },
  paidText: { fontWeight: 700, fontSize: '15px', color: '#34C759' },
  xpText: { fontWeight: 700, fontSize: '12px', color: '#52734D' },
  attachBadge: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#666', maxWidth: '120px' },
  attachName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  actionBtns: { display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' },
  completeBtn: { backgroundColor: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' },
  deleteBtn: { display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'transparent', border: '1.5px solid #c73434', borderRadius: '8px', color: '#c73434', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '12px', padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap' },
  completedTag: { fontSize: '12px', fontWeight: 700, color: '#1e3a5f', backgroundColor: '#dbeafe', padding: '4px 10px', borderRadius: '8px', textAlign: 'right', whiteSpace: 'nowrap' },

  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '24px' },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalHeader: { marginBottom: '12px' },
  modalTitle: { color: '#c73434', fontWeight: 700, fontSize: '20px', margin: 0 },
  modalBody: { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 24px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
  cancelBtn: { background: 'none', border: '1.5px solid #ddd', borderRadius: '20px', padding: '8px 20px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '14px', color: '#666', cursor: 'pointer' },
  confirmDeleteBtn: { backgroundColor: '#c73434', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 20px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
};