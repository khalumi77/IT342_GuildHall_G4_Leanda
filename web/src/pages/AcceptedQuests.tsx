// src/pages/AcceptedQuests.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/authApi';
import QuestDetailModal, { type QuestDetail, StatusBadge } from '../components/QuestDetailModal';
import { useAuth } from '../context/AuthContext';

type AcceptedQuest = QuestDetail & {
  guildId: number;
  guildName: string;
  posterUsername?: string;
};

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

export default function AcceptedQuests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quests, setQuests] = useState<AcceptedQuest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [selectedQuest, setSelectedQuest] = useState<AcceptedQuest | null>(null);

  useEffect(() => {
    api.get('/quests/accepted')
      .then(res => {
        const data = res.data?.data ?? res.data;
        setQuests(Array.isArray(data) ? data : []);
      })
      .catch(() => setQuests([]))
      .finally(() => setIsLoading(false));
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try { return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return ''; }
  };

  const filtered = quests.filter(q => filter === 'ALL' || q.status === filter);
  const pendingCount = quests.filter(q => q.status === 'PENDING').length;
  const completedCount = quests.filter(q => q.status === 'COMPLETED').length;

  return (
    <div style={s.page}>
      <Navbar />

      {/* Quest detail modal — read-only for accepted quests (no accept/complete/delete) */}
      {selectedQuest && (
        <QuestDetailModal
          quest={selectedQuest}
          onClose={() => setSelectedQuest(null)}
          currentUserId={user?.id ?? 0}
          // No onAccept, onComplete, or onDelete — this page is read-only
          showGuildLink={true}
        />
      )}

      <main style={s.main}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>← Back</button>

        <div style={s.pageHeader}>
          <h1 style={s.pageTitle}>Accepted Quests</h1>
          <div style={s.pageSubtitle}>Quests you've taken on across all guilds</div>
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color: '#92400e' }}>{pendingCount}</div>
            <div style={s.statLabel}>In Progress</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color: '#1e3a5f' }}>{completedCount}</div>
            <div style={s.statLabel}>Completed</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color: '#52734D' }}>3</div>
            <div style={s.statLabel}>Max per Guild</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={s.tabRow}>
          {(['ALL', 'PENDING', 'COMPLETED'] as const).map(f => (
            <button key={f} style={{ ...s.tab, ...(filter === f ? s.tabActive : {}) }}
              onClick={() => setFilter(f)}>
              {f === 'ALL' ? `All (${quests.length})` :
               f === 'PENDING' ? `In Progress (${pendingCount})` :
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
              {filter === 'ALL' ? 'No accepted quests yet' : `No ${filter === 'PENDING' ? 'in-progress' : 'completed'} quests`}
            </div>
            <div style={s.emptySubtitle}>
              {filter === 'ALL' ? 'Browse a guild and accept a quest to get started!' : 'Try switching to a different filter.'}
            </div>
            {filter === 'ALL' && (
              <button style={s.browseBtn} onClick={() => navigate('/guilds')}>Go to My Guilds</button>
            )}
          </div>
        ) : (
          <div style={s.list}>
            {filtered.map(quest => (
              <div
                key={quest.id}
                style={{ ...s.card, opacity: quest.status === 'COMPLETED' ? 0.8 : 1, cursor: 'pointer' }}
                onClick={() => setSelectedQuest(quest)}
              >
                {/* Left: icon + info */}
                <div style={s.cardMain}>
                  <QuestIcon size={42} />
                  <div style={s.cardInfo}>
                    <div style={s.cardTitle}>{quest.title}</div>
                    <div style={s.cardMeta}>
                      <span style={s.categoryChip}>{quest.category}</span>
                      <StatusBadge status={quest.status} />
                      <span style={s.guildChip}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                        {quest.guildName}
                      </span>
                    </div>
                    <div style={s.commissionerRow}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                      Commissioned by <strong>{quest.postedBy}</strong>
                      {quest.createdAt && <span style={s.dateMeta}> · {formatDate(quest.createdAt)}</span>}
                    </div>
                    <div style={s.cardDesc}>{quest.description}</div>
                  </div>
                </div>

                {/* Right: reward */}
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
                  <div style={s.viewHint}>Click to view →</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
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
  tabRow: { display: 'flex', borderBottom: '2px solid #eee', marginBottom: '16px' },
  tab: { background: 'none', border: 'none', padding: '10px 16px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '13px', color: '#888', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  tabActive: { color: '#34C759', borderBottom: '2px solid #34C759' },
  empty: { color: '#888', textAlign: 'center', marginTop: '60px', fontSize: '15px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: '10px' },
  emptyTitle: { fontWeight: 700, fontSize: '18px', color: '#555' },
  emptySubtitle: { fontSize: '14px', color: '#aaa', textAlign: 'center', maxWidth: '280px', lineHeight: '1.5' },
  browseBtn: { marginTop: '8px', backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 24px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { backgroundColor: '#DDFFBC', borderRadius: '14px', border: '1.5px solid rgba(82,115,77,0.2)', display: 'flex', alignItems: 'stretch', overflow: 'hidden', transition: 'opacity 0.2s, filter 0.15s' },
  cardMain: { display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 18px', flex: 1, minWidth: 0 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: { fontWeight: 700, fontSize: '15px', color: '#1a1a1a', marginBottom: '6px', lineHeight: '1.3' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' },
  categoryChip: { fontSize: '11px', fontWeight: 600, color: '#52734D', textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: 'rgba(82,115,77,0.15)', padding: '2px 8px', borderRadius: '20px' },
  guildChip: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: 600, color: '#52734D', backgroundColor: 'rgba(82,115,77,0.08)', padding: '2px 8px', borderRadius: '20px' },
  commissionerRow: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#888', marginBottom: '4px' },
  dateMeta: { color: '#aaa' },
  cardDesc: { fontSize: '13px', color: '#555', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', padding: '14px 16px', borderLeft: '1px solid rgba(82,115,77,0.15)', backgroundColor: 'rgba(255,255,255,0.35)', minWidth: '130px', flexShrink: 0 },
  rewardSection: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' },
  volBadge: { backgroundColor: '#34C759', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' },
  paidText: { fontWeight: 700, fontSize: '15px', color: '#34C759' },
  xpText: { fontWeight: 700, fontSize: '12px', color: '#52734D' },
  attachBadge: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#666', maxWidth: '120px' },
  attachName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  viewHint: { fontSize: '12px', color: '#52734D', fontWeight: 600 },
};