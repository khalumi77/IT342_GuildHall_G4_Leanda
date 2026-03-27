// src/pages/GuildDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../api/authApi';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GuildInfo {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  questCount: number;
  isMember: boolean;
}

interface Quest {
  id: number;
  title: string;
  category: string;
  description: string;
  questType: 'VOLUNTEER' | 'PAID';
  reward: number | null;
  xpReward: number;
  status: string;
  postedBy: string;
  createdAt: string | null;
  attachmentName: string | null;
  attachmentData: string | null;
}

const CATEGORIES = ['Design', 'Academic', 'Manual Labor', 'Tutoring', 'Media', 'IT/Tech', 'Writing'];

// ── Daily quote helpers ─────────────────────────────────────────────────────

const QUOTE_CACHE_KEY = 'guildhall_daily_quote';

interface DailyQuote { text: string; author: string; date: string; }

const FALLBACK_QUOTES: { text: string; author: string }[] = [
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
];

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getCachedQuote(): DailyQuote | null {
  try {
    const raw = sessionStorage.getItem(QUOTE_CACHE_KEY);
    if (!raw) return null;
    const parsed: DailyQuote = JSON.parse(raw);
    return parsed.date === getTodayString() ? parsed : null;
  } catch { return null; }
}

function setCachedQuote(q: DailyQuote) {
  try { sessionStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(q)); }
  catch { /* not critical */ }
}

// ── Quest Icon SVG ─────────────────────────────────────────────────────────────
function QuestIcon({ size = 40 }: { size?: number }) {
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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GuildDashboard() {
  const { guildId } = useParams<{ guildId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(getCachedQuote);
  const [quoteLoading, setQuoteLoading] = useState(quote === null);
  const [search, setSearch] = useState('');

  // Commission form
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    questType: 'VOLUNTEER' as 'VOLUNTEER' | 'PAID',
    reward: '',
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quest detail modal
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  useEffect(() => {
    if (!guildId) { setNotFound(true); setIsLoading(false); return; }
    setIsLoading(true);

    Promise.all([
      api.get(`/guilds/${guildId}`),
      api.get(`/guilds/${guildId}/quests`),
    ])
      .then(([guildRes, questsRes]) => {
        setGuild(guildRes.data?.data ?? guildRes.data);
        const qData = questsRes.data?.data ?? questsRes.data;
        setQuests(Array.isArray(qData) ? qData : []);
      })
      .catch(err => {
        if (err?.response?.status === 403) navigate('/guilds');
        else setNotFound(true);
      })
      .finally(() => setIsLoading(false));
  }, [guildId, navigate]);

  // ── Fetch daily quote from backend proxy ──────────────────────────────────
  useEffect(() => {
    // Already have today's quote cached in sessionStorage — skip network call
    if (quote !== null) { setQuoteLoading(false); return; }

    setQuoteLoading(true);
    api.get('/wisdom')
      .then(res => {
        const data = res.data?.data ?? res.data;
        if (data?.text && data?.author) {
          const fresh = { text: data.text, author: data.author, date: getTodayString() };
          setCachedQuote(fresh);
          setQuote(fresh);
        } else {
          throw new Error('bad response');
        }
      })
      .catch(() => {
        // Use a deterministic fallback based on today's date so all users see the same one
        const dayIndex = new Date().getDate() % FALLBACK_QUOTES.length;
        setQuote(FALLBACK_QUOTES[dayIndex]);
      })
      .finally(() => setQuoteLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setFormError('File must be under 5MB.'); return; }
    setAttachmentFile(file);
    const reader = new FileReader();
    reader.onload = () => setAttachmentPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetForm = () => {
    setForm({ title: '', category: '', description: '', questType: 'VOLUNTEER', reward: '' });
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setFormError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitQuest = async () => {
    setFormError('');
    if (!form.title.trim()) { setFormError('Quest title is required.'); return; }
    if (!form.category) { setFormError('Please select a category.'); return; }
    if (!form.description.trim()) { setFormError('Description is required.'); return; }
    if (form.questType === 'PAID' && (!form.reward || isNaN(Number(form.reward)) || Number(form.reward) <= 0)) {
      setFormError('Please enter a valid payment amount.'); return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        questType: form.questType,
        reward: form.questType === 'PAID' ? Number(form.reward) : null,
        attachmentName: attachmentFile?.name ?? null,
        attachmentPath: attachmentPreview ?? null,
      };

      const res = await api.post(`/guilds/${guildId}/quests`, payload);
      const newQuest = res.data?.data ?? res.data;
      setQuests(prev => [newQuest, ...prev]);
      resetForm();
      setShowCommissionForm(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(e?.response?.data?.error?.message || 'Failed to post quest.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuest = async (questId: number) => {
    try {
      await api.delete(`/guilds/${guildId}/quests/${questId}`);
      setQuests(prev => prev.filter(q => q.id !== questId));
      setSelectedQuest(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      alert(e?.response?.data?.error?.message || 'Failed to delete quest.');
    }
  };

  const filtered = quests.filter(q =>
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    q.category.toLowerCase().includes(search.toLowerCase()) ||
    q.description.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return (
    <div style={s.page}><Navbar />
      <div style={s.centered}>Loading quest board...</div>
    </div>
  );

  if (notFound || !guild) return (
    <div style={s.page}><Navbar />
      <div style={s.centered}>
        <div style={{ color: '#888', fontSize: '16px' }}>Guild not found.</div>
        <button style={s.backBtn} onClick={() => navigate('/guilds')}>← Back to My Guilds</button>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <Navbar />

      <main style={s.main}>
        <button style={s.backBtn} onClick={() => navigate('/guilds')}>← My Guilds</button>

        {/* Daily Quote */}
        <div style={s.quoteSection}>
          <div style={s.quoteLabel}>Today's Heroes' Wisdom</div>
          {quoteLoading ? (
            <>
              <div style={s.quoteShimmer} />
              <div style={{ ...s.quoteShimmer, width: '40%', marginTop: '6px' }} />
            </>
          ) : quote ? (
            <>
              <div style={s.quoteText}>"{quote.text}"</div>
              <div style={s.quoteAuthor}>–{quote.author}</div>
            </>
          ) : null}
        </div>

        {/* Quest panel */}
        <div style={s.questPanel}>
          <div style={s.panelHeader}>
            <div style={s.panelTitleRow}>
              <h2 style={s.panelTitle}>{guild.name} Quests</h2>
              <button style={s.commissionBtn} onClick={() => { resetForm(); setShowCommissionForm(true); }}>
                + Commission Quest
              </button>
            </div>
            <div style={s.searchWrap}>
              <svg style={s.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input style={s.searchInput} placeholder="Search quests" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={s.emptyState}>
              <div style={{ fontSize: '44px', opacity: 0.3, marginBottom: '6px' }}>⚔️</div>
              <div style={s.emptyTitle}>No quests yet</div>
              <div style={s.emptySubtitle}>
                {search ? 'No quests match your search.' : 'Be the first to commission a quest!'}
              </div>
            </div>
          ) : (
            <div style={s.questGrid}>
              {filtered.map(quest => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  currentUser={user?.username ?? ''}
                  onClick={() => setSelectedQuest(quest)}
                  onDelete={() => handleDeleteQuest(quest.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={s.guildFooter}>
          <span style={s.footerItem}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {guild.memberCount} members
          </span>
          <span style={s.footerItem}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            {quests.length} active quests
          </span>
          {guild.description && <span style={s.footerDesc}>{guild.description}</span>}
        </div>
      </main>

      {/* ── Commission Quest Modal ──────────────────────────────────────────── */}
      {showCommissionForm && (
        <div style={s.overlay} onClick={() => setShowCommissionForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>

            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Commission Quest</h2>
              <button style={s.closeXBtn} onClick={() => setShowCommissionForm(false)}>✕</button>
            </div>

            {formError && <div style={s.errorBox}>{formError}</div>}

            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>Quest Title <span style={{ color: '#c73434' }}>*</span></label>
              <input style={s.fieldInput} placeholder="Enter quest title here" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={100} />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>Category <span style={{ color: '#c73434' }}>*</span></label>
              <div style={s.categoryGrid}>
                {CATEGORIES.map(cat => (
                  <label key={cat} style={s.categoryOption}>
                    <input type="radio" name="cat" value={cat} checked={form.category === cat}
                      onChange={() => setForm(f => ({ ...f, category: cat }))}
                      style={{ accentColor: '#34C759', marginRight: '5px' }} />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>File Attachment <span style={{ color: '#aaa', fontWeight: 400, fontSize: '12px' }}>(optional)</span></label>
              {attachmentFile ? (
                <div style={s.attachPreviewRow}>
                  <span style={{ fontSize: '18px' }}>
                    {attachmentFile.type.startsWith('image/') ? '🖼️' : '📄'}
                  </span>
                  <span style={s.attachNameText}>{attachmentFile.name}</span>
                  <button style={s.removeBtn} onClick={removeAttachment}>✕</button>
                </div>
              ) : (
                <button style={s.uploadBtn} onClick={() => fileInputRef.current?.click()}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
              <div style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}>Images or PDF · max 5MB</div>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>Description <span style={{ color: '#c73434' }}>*</span></label>
              <textarea style={s.fieldTextarea} placeholder="Describe the quest in detail..." value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} maxLength={1000} />
              <div style={{ fontSize: '11px', color: '#bbb', textAlign: 'right', marginTop: '3px' }}>{form.description.length}/1000</div>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>Reward Type <span style={{ color: '#c73434' }}>*</span></label>
              <div style={s.rewardTypeRow}>
                <label style={s.rewardOption}>
                  <input type="radio" name="rewardType" checked={form.questType === 'VOLUNTEER'}
                    onChange={() => setForm(f => ({ ...f, questType: 'VOLUNTEER', reward: '' }))}
                    style={{ accentColor: '#34C759', marginRight: '6px' }} />
                  Volunteer
                </label>
                <label style={s.rewardOption}>
                  <input type="radio" name="rewardType" checked={form.questType === 'PAID'}
                    onChange={() => setForm(f => ({ ...f, questType: 'PAID' }))}
                    style={{ accentColor: '#34C759', marginRight: '6px' }} />
                  Payment
                </label>
                {form.questType === 'PAID' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
                    <span style={{ fontWeight: 700, color: '#52734D', fontSize: '15px' }}>₱</span>
                    <input style={s.paymentInput} type="number" min="1" placeholder="Offered amount"
                      value={form.reward} onChange={e => setForm(f => ({ ...f, reward: e.target.value }))} />
                  </div>
                )}
              </div>
              <div style={s.xpNote}>✦ All quests award <strong>+20 XP</strong> upon completion</div>
            </div>

            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={() => setShowCommissionForm(false)}>Cancel</button>
              <button style={{ ...s.postQuestBtn, opacity: submitting ? 0.7 : 1 }}
                onClick={handleSubmitQuest} disabled={submitting}>
                {submitting ? 'Posting...' : 'Post Quest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quest Detail Modal ──────────────────────────────────────────────── */}
      {selectedQuest && (
        <QuestDetailModal
          quest={selectedQuest}
          onClose={() => setSelectedQuest(null)}
          currentUser={user?.username ?? ''}
          onDelete={() => handleDeleteQuest(selectedQuest.id)}
        />
      )}
    </div>
  );
}

// ── Quest Card Component ───────────────────────────────────────────────────────

function QuestCard({ quest, currentUser, onClick, onDelete }: { quest: Quest; currentUser: string; onClick: () => void; onDelete: () => void }) {
  const isPaid = quest.questType === 'PAID';
  const isOwn = quest.postedBy === currentUser;
  return (
    <div style={cs.card}>
      <div style={{ ...cs.cardClickArea }} onClick={onClick}>
        <div style={cs.cardHeader}>
          <QuestIcon size={38} />
          <div style={{ flex: 1 }}>
            <div style={cs.cardTitle}>{quest.title}</div>
            <div style={cs.cardCategory}>{quest.category}</div>
          </div>
        </div>
        <div style={cs.divider} />
        <div style={cs.postedBy}>posted by: {quest.postedBy}</div>
        <div>
          <div style={cs.descLabel}>Description:</div>
          <div style={cs.descText}>{quest.description}</div>
        </div>
        {quest.attachmentName && (
          <div style={cs.attachRow}>
            <span style={{ fontSize: '15px' }}>
              {quest.attachmentName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? '🖼️' : '📄'}
            </span>
            <span style={cs.attachText}>{quest.attachmentName}</span>
          </div>
        )}
      </div>
      <div style={cs.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={cs.rewardLabel}>Reward:</span>
          {isPaid
            ? <span style={cs.paidText}>₱ {Number(quest.reward).toLocaleString()}</span>
            : <span style={cs.volBadge}>Volunteer</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={cs.xpText}>+{quest.xpReward} XP</span>
          {isOwn && (
            <button
              style={cs.deleteCardBtn}
              onClick={e => { e.stopPropagation(); if (window.confirm('Delete this quest?')) onDelete(); }}
              title="Delete quest"
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Quest Detail Modal Component ───────────────────────────────────────────────

function QuestDetailModal({ quest, onClose, currentUser, onDelete }: {
  quest: Quest; onClose: () => void; currentUser: string; onDelete: () => void;
}) {
  const isPaid = quest.questType === 'PAID';
  const isOwn = quest.postedBy === currentUser;

  const handleDelete = () => {
    if (window.confirm('Delete this quest? This cannot be undone.')) onDelete();
  };

  return (
    <div style={dm.overlay} onClick={onClose}>
      <div style={dm.modal} onClick={e => e.stopPropagation()}>
        <button style={dm.closeBtn} onClick={onClose}>✕</button>

        <div style={dm.headerRow}>
          <QuestIcon size={52} />
          <div style={{ flex: 1 }}>
            <div style={dm.title}>{quest.title}</div>
            <div style={dm.categoryChip}>{quest.category}</div>
          </div>
        </div>

        <div style={dm.postedBy}>posted by: {quest.postedBy}</div>
        <div style={dm.divider} />

        <div style={dm.descLabel}>Description:</div>
        <div style={dm.descText}>{quest.description}</div>

        {quest.attachmentName && (
          <div style={dm.attachBox}>
            <span style={{ fontSize: '22px' }}>
              {quest.attachmentName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? '🖼️' : '📄'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={dm.attachName}>{quest.attachmentName}</div>
              {quest.attachmentData && quest.attachmentName.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                <img src={quest.attachmentData} alt={quest.attachmentName}
                  style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '6px', marginTop: '8px', objectFit: 'contain' }} />
              )}
            </div>
          </div>
        )}

        <div style={dm.footer}>
          {!isOwn && (
            <button style={dm.acceptBtn} title="Quest acceptance — coming soon">
              Accept Quest
            </button>
          )}
          {isOwn && (
            <button style={dm.deleteBtn} onClick={handleDelete}>
              🗑 Delete Quest
            </button>
          )}
          <div style={dm.rewardGroup}>
            <span style={dm.rewardLabel}>Reward:</span>
            {isPaid
              ? <span style={dm.paidText}>₱ {Number(quest.reward).toLocaleString()}</span>
              : <span style={dm.volBadge}>Volunteer</span>}
            <span style={dm.xpText}>+{quest.xpReward} XP</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: "'Prompt', sans-serif" },
  centered: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' },
  main: { maxWidth: '800px', margin: '0 auto', padding: '20px 24px 48px' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#52734D', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '13px', padding: '0 0 4px', display: 'inline-flex', alignItems: 'center' },
  quoteSection: { textAlign: 'center', padding: '16px 0 20px' },
  quoteLabel: { color: '#34C759', fontWeight: 700, fontSize: '15px', marginBottom: '8px' },
  quoteText: { color: '#555', fontSize: '14px', fontStyle: 'italic', lineHeight: '1.6', maxWidth: '500px', margin: '0 auto 4px' },
  quoteAuthor: { color: '#999', fontSize: '12px', fontWeight: 500 },
  quoteShimmer: {
    height: '14px', borderRadius: '6px',
    background: 'linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    width: '70%', margin: '0 auto',
  },
  questPanel: { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid #eee', overflow: 'hidden', marginBottom: '16px' },
  panelHeader: { padding: '16px 20px 14px', borderBottom: '1px solid #f0f0f0' },
  panelTitleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' },
  panelTitle: { color: '#34C759', fontWeight: 700, fontSize: '20px', margin: 0 },
  commissionBtn: { backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '20px', padding: '7px 18px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0 },
  searchWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '11px', pointerEvents: 'none' },
  searchInput: { width: '100%', minWidth: '260px', padding: '8px 12px 8px 32px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontFamily: "'Prompt', sans-serif", fontSize: '13px', outline: 'none', backgroundColor: '#fafafa', boxSizing: 'border-box' },
  questGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', padding: '16px 20px 20px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: '8px' },
  emptyTitle: { fontWeight: 700, fontSize: '17px', color: '#666' },
  emptySubtitle: { fontSize: '13px', color: '#bbb', textAlign: 'center', maxWidth: '240px', lineHeight: '1.5' },
  guildFooter: { display: 'flex', alignItems: 'center', gap: '20px', padding: '0 4px', flexWrap: 'wrap' },
  footerItem: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#999', fontWeight: 500 },
  footerDesc: { fontSize: '12px', color: '#bbb', fontStyle: 'italic' },
  // Modal
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' },
  modal: { backgroundColor: '#fff', borderRadius: '20px', width: '100%', maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.22)', padding: '28px' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', paddingBottom: '14px', borderBottom: '2px solid #f0f0f0' },
  modalTitle: { color: '#34C759', fontWeight: 700, fontSize: '24px', margin: 0 },
  closeXBtn: { background: '#c73434', border: 'none', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0 },
  errorBox: { backgroundColor: '#ffe5e5', color: '#c73434', border: '1px solid #f5c6c6', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' },
  fieldGroup: { marginBottom: '18px' },
  fieldLabel: { display: 'block', color: '#34C759', fontWeight: 700, fontSize: '14px', marginBottom: '7px' },
  fieldInput: { width: '100%', padding: '10px 14px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontFamily: "'Prompt', sans-serif", fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  fieldTextarea: { width: '100%', padding: '10px 14px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontFamily: "'Prompt', sans-serif", fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: '1.5' },
  categoryGrid: { display: 'flex', flexWrap: 'wrap', gap: '4px 18px' },
  categoryOption: { display: 'flex', alignItems: 'center', fontSize: '14px', color: '#444', cursor: 'pointer', fontFamily: "'Prompt', sans-serif", padding: '3px 0' },
  uploadBtn: { display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', backgroundColor: '#f5f5f5', border: '1.5px solid #ddd', borderRadius: '8px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '13px', color: '#555', cursor: 'pointer' },
  attachPreviewRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', border: '1.5px solid #DDFFBC', borderRadius: '8px', backgroundColor: '#f9fff5' },
  attachNameText: { flex: 1, fontSize: '13px', color: '#444', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  removeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#c73434', fontWeight: 700, fontSize: '14px', padding: '2px 6px' },
  rewardTypeRow: { display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' },
  rewardOption: { display: 'flex', alignItems: 'center', fontSize: '14px', color: '#444', cursor: 'pointer', fontFamily: "'Prompt', sans-serif" },
  paymentInput: { padding: '8px 10px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontFamily: "'Prompt', sans-serif", fontSize: '14px', outline: 'none', width: '150px' },
  xpNote: { fontSize: '12px', color: '#666', marginTop: '10px', backgroundColor: '#f9fff5', border: '1px solid #DDFFBC', borderRadius: '6px', padding: '7px 12px', display: 'inline-block' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' },
  cancelBtn: { background: 'none', border: '1.5px solid #ddd', borderRadius: '20px', padding: '9px 22px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '14px', color: '#777', cursor: 'pointer' },
  postQuestBtn: { backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '20px', padding: '9px 24px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
};

const cs: Record<string, React.CSSProperties> = {
  card: { backgroundColor: '#DDFFBC', borderRadius: '14px', border: '1.5px solid rgba(82,115,77,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  cardClickArea: { padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: '12px' },
  cardTitle: { fontWeight: 700, fontSize: '15px', color: '#1a1a1a', lineHeight: '1.3', marginBottom: '3px' },
  cardCategory: { fontSize: '11px', fontWeight: 600, color: '#52734D', textTransform: 'uppercase', letterSpacing: '0.5px' },
  divider: { height: '1px', backgroundColor: 'rgba(82,115,77,0.2)' },
  postedBy: { fontSize: '12px', color: '#666' },
  descLabel: { fontWeight: 700, fontSize: '13px', color: '#333', marginBottom: '3px' },
  descText: { fontSize: '13px', color: '#555', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  attachRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid rgba(82,115,77,0.2)' },
  attachText: { fontSize: '12px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid rgba(82,115,77,0.15)', backgroundColor: 'rgba(255,255,255,0.3)' },
  deleteCardBtn: { background: 'none', border: '1.5px solid #c73434', borderRadius: '6px', color: '#c73434', fontSize: '13px', padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  rewardLabel: { fontWeight: 700, fontSize: '13px', color: '#333' },
  volBadge: { backgroundColor: '#34C759', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' },
  paidText: { fontWeight: 700, fontSize: '14px', color: '#34C759' },
  xpText: { fontWeight: 700, fontSize: '13px', color: '#52734D' },
};

const dm: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '20px' },
  modal: { backgroundColor: '#DDFFBC', borderRadius: '20px', width: '100%', maxWidth: '560px', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', padding: '28px', position: 'relative' },
  closeBtn: { position: 'absolute', top: '16px', right: '16px', background: '#c73434', border: 'none', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: '14px' },
  headerRow: { display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '14px' },
  title: { fontWeight: 700, fontSize: '20px', color: '#1a1a1a', lineHeight: '1.3', marginBottom: '6px' },
  categoryChip: { fontSize: '11px', fontWeight: 600, color: '#52734D', textTransform: 'uppercase', letterSpacing: '0.8px', backgroundColor: 'rgba(82,115,77,0.15)', padding: '3px 10px', borderRadius: '20px', display: 'inline-block' },
  postedBy: { fontSize: '13px', color: '#666', marginBottom: '12px' },
  divider: { height: '1.5px', backgroundColor: 'rgba(82,115,77,0.25)', marginBottom: '14px' },
  descLabel: { fontWeight: 700, fontSize: '14px', color: '#333', marginBottom: '6px' },
  descText: { fontSize: '14px', color: '#444', lineHeight: '1.65', marginBottom: '16px' },
  attachBox: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid rgba(82,115,77,0.2)', marginBottom: '20px' },
  attachName: { fontWeight: 600, fontSize: '13px', color: '#333' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', paddingTop: '8px' },
  acceptBtn: { backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '15px', cursor: 'pointer' },
  deleteBtn: { backgroundColor: 'transparent', color: '#c73434', border: '1.5px solid #c73434', borderRadius: '10px', padding: '10px 20px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
  rewardGroup: { display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' },
  rewardLabel: { fontWeight: 700, fontSize: '14px', color: '#333' },
  volBadge: { backgroundColor: '#34C759', color: '#fff', fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' },
  paidText: { fontWeight: 700, fontSize: '16px', color: '#34C759' },
  xpText: { fontWeight: 700, fontSize: '14px', color: '#52734D' },
};