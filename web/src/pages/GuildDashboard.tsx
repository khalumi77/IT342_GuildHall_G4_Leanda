// src/pages/GuildDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../api/authApi';
import { supabase } from '../api/supabaseClient';
import QuestDetailModal, { type QuestDetail, StatusBadge } from '../components/QuestDetailModal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GuildInfo {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  questCount: number;
  isMember: boolean;
}

type Quest = QuestDetail;

const CATEGORIES = ['Design', 'Academic', 'Manual Labor', 'Tutoring', 'Media', 'IT/Tech', 'Writing'];

// ── Daily quote helpers ───────────────────────────────────────────────────────

const QUOTE_CACHE_KEY = 'guildhall_daily_quote';
interface DailyQuote { text: string; author: string; date: string; }
const FALLBACK_QUOTES = [
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
];
function getTodayString() { return new Date().toISOString().slice(0, 10); }
function getCachedQuote(): DailyQuote | null {
  try {
    const raw = sessionStorage.getItem(QUOTE_CACHE_KEY);
    if (!raw) return null;
    const parsed: DailyQuote = JSON.parse(raw);
    return parsed.date === getTodayString() ? parsed : null;
  } catch { return null; }
}
function setCachedQuote(q: DailyQuote) {
  try { sessionStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(q)); } catch { /**/ }
}

// ── Attachment helpers ────────────────────────────────────────────────────────

function downloadPdf(url: string, filename: string) {
  const a = document.createElement('a'); a.href = url; a.download = filename;
  a.target = '_blank'; a.rel = 'noopener noreferrer';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ── Quest Icon ────────────────────────────────────────────────────────────────

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

// ── Accept Celebration Popup ──────────────────────────────────────────────────

function AcceptedPopup({ quest, onOpenChat, onClose }: {
  quest: Quest; onOpenChat: () => void; onClose: () => void;
}) {
  return (
    <div style={ap.overlay} onClick={onClose}>
      <div style={ap.card} onClick={e => e.stopPropagation()}>
        <div style={ap.celebration}>⚔️</div>
        <div style={ap.title}>Quest Accepted!</div>
        <div style={ap.subtitle}>
          You've taken on <strong>"{quest.title}"</strong>.<br />
          It will appear in your Accepted Quests page.
        </div>
        <div style={ap.rule}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          You can hold up to <strong>3 active quests</strong> per guild at a time.
        </div>
        <div style={ap.actions}>
          <button style={ap.chatBtn} onClick={onOpenChat}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Open Chat
          </button>
          <button style={ap.nowBtn} onClick={onClose}>Not Now</button>
        </div>
      </div>
    </div>
  );
}

const ap: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '24px' },
  card: { backgroundColor: '#fff', borderRadius: '20px', padding: '32px 28px', maxWidth: '400px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', textAlign: 'center', fontFamily: "'Prompt', sans-serif" },
  celebration: { fontSize: '52px', marginBottom: '12px' },
  title: { fontWeight: 700, fontSize: '22px', color: '#166534', marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: '#444', lineHeight: '1.6', marginBottom: '16px' },
  rule: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#92400e', marginBottom: '24px' },
  actions: { display: 'flex', flexDirection: 'column', gap: '10px' },
  chatBtn: { backgroundColor: '#52734D', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  nowBtn: { background: 'none', border: '1.5px solid #ddd', borderRadius: '12px', padding: '11px 24px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '14px', color: '#666', cursor: 'pointer' },
};

// ── Main Component ────────────────────────────────────────────────────────────

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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'PENDING'>('ALL');

  // Commission form
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', description: '', questType: 'VOLUNTEER' as 'VOLUNTEER' | 'PAID', reward: '' });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [compressingImage, setCompressingImage] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quest detail modal
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  // Accept flow
  const [accepting, setAccepting] = useState<number | null>(null);
  const [acceptedQuest, setAcceptedQuest] = useState<Quest | null>(null);

  // Complete flow
  const [completing, setCompleting] = useState<number | null>(null);

  useEffect(() => {
    if (!guildId) { setNotFound(true); setIsLoading(false); return; }
    setIsLoading(true);
    Promise.all([api.get(`/guilds/${guildId}`), api.get(`/guilds/${guildId}/quests`)])
      .then(([guildRes, questsRes]) => {
        setGuild(guildRes.data?.data ?? guildRes.data);
        const qData = questsRes.data?.data ?? questsRes.data;
        setQuests(Array.isArray(qData) ? qData : []);
      })
      .catch(err => { if (err?.response?.status === 403) navigate('/guilds'); else setNotFound(true); })
      .finally(() => setIsLoading(false));
  }, [guildId, navigate]);

  useEffect(() => {
    if (quote !== null) { setQuoteLoading(false); return; }
    setQuoteLoading(true);
    api.get('/wisdom')
      .then(res => {
        const data = res.data?.data ?? res.data;
        if (data?.text && data?.author) {
          const fresh = { text: data.text, author: data.author, date: getTodayString() };
          setCachedQuote(fresh); setQuote(fresh);
        } else throw new Error('bad');
      })
      .catch(() => setQuote(FALLBACK_QUOTES[new Date().getDate() % FALLBACK_QUOTES.length]))
      .finally(() => setQuoteLoading(false));
  }, []); // eslint-disable-line

  // ── Accept quest ──────────────────────────────────────────────────────────

  const handleAcceptQuest = async (questId: number) => {
    setAccepting(questId);
    try {
      const res = await api.post(`/guilds/${guildId}/quests/${questId}/accept`);
      const updated: Quest = res.data?.data ?? res.data;
      setQuests(prev => prev.map(q => q.id === questId ? { ...q, ...updated } : q));
      setSelectedQuest(null);
      setAcceptedQuest(updated);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      alert(e?.response?.data?.error?.message || 'Failed to accept quest.');
    } finally {
      setAccepting(null);
    }
  };

  // ── Complete quest ────────────────────────────────────────────────────────

  const handleCompleteQuest = async (questId: number) => {
    if (!window.confirm('Mark this quest as completed? The helper will be credited.')) return;
    setCompleting(questId);
    try {
      const res = await api.post(`/guilds/${guildId}/quests/${questId}/complete`);
      const updated: Quest = res.data?.data ?? res.data;
      // Remove from board — completed quests are hidden from guild dashboard
      setQuests(prev => prev.filter(q => q.id !== questId));
      setSelectedQuest(null);
      // Show a brief success toast via alert for now
      alert(`✓ Quest marked as completed! ${updated.helperUsername ?? 'The helper'} has been credited.`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      alert(e?.response?.data?.error?.message || 'Failed to mark quest complete.');
    } finally {
      setCompleting(null);
    }
  };

  // ── Delete quest ──────────────────────────────────────────────────────────

  const handleDeleteQuest = async (questId: number) => {
    if (!window.confirm('Delete this quest? This cannot be undone.')) return;
    try {
      await api.delete(`/guilds/${guildId}/quests/${questId}`);
      setQuests(prev => prev.filter(q => q.id !== questId));
      setSelectedQuest(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      alert(e?.response?.data?.error?.message || 'Failed to delete quest.');
    }
  };

  // ── Commission form ───────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPDF = file.type === 'application/pdf';
    if (isPDF) {
      if (file.size > 500 * 1024) { setFormError('PDF must be under 500 KB.'); return; }
      setAttachmentFile(file);
      const reader = new FileReader();
      reader.onload = () => setAttachmentPreview(reader.result as string);
      reader.readAsDataURL(file);
      return;
    }
    if (file.size > 10 * 1024 * 1024) { setFormError('Image must be under 10 MB.'); return; }
    setAttachmentFile(file);
    setCompressingImage(true);
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
        else { width = Math.round((width / height) * MAX); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      setAttachmentPreview(canvas.toDataURL('image/jpeg', 0.7));
      setCompressingImage(false);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => { setAttachmentPreview(reader.result as string); setCompressingImage(false); };
      reader.readAsDataURL(file);
    };
    img.src = objectUrl;
  };

  const removeAttachment = () => {
    setAttachmentFile(null); setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetForm = () => {
    setForm({ title: '', category: '', description: '', questType: 'VOLUNTEER', reward: '' });
    setAttachmentFile(null); setAttachmentPreview(null); setFormError('');
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
      let attachmentUrl: string | null = null;
      const attachmentFileName: string | null = attachmentFile?.name ?? null;
      if (attachmentFile) {
        setCompressingImage(true);
        const ext = attachmentFile.name.split('.').pop();
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = `guild-${guildId}/${uniqueName}`;
        const { error: uploadError } = await supabase.storage.from('quest-attachments').upload(filePath, attachmentFile, { upsert: false });
        setCompressingImage(false);
        if (uploadError) { setFormError(`File upload failed: ${uploadError.message}`); setSubmitting(false); return; }
        const { data: urlData } = supabase.storage.from('quest-attachments').getPublicUrl(filePath);
        attachmentUrl = urlData.publicUrl;
      }
      const payload: Record<string, unknown> = {
        title: form.title.trim(), category: form.category, description: form.description.trim(),
        questType: form.questType, reward: form.questType === 'PAID' ? Number(form.reward) : null,
        attachmentName: attachmentFileName, attachmentPath: attachmentUrl,
      };
      const res = await api.post(`/guilds/${guildId}/quests`, payload);
      const newQuest = res.data?.data ?? res.data;
      setQuests(prev => [{ ...newQuest, attachmentData: attachmentUrl ?? null }, ...prev]);
      resetForm();
      setShowCommissionForm(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(e?.response?.data?.error?.message || 'Failed to post quest.');
    } finally { setSubmitting(false); }
  };

  // ── Filter — COMPLETED quests are hidden from board ───────────────────────

  const visibleQuests = quests.filter(q => q.status !== 'COMPLETED' && q.status !== 'CANCELLED');

  const filtered = visibleQuests.filter(q => {
    const matchSearch = q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.category.toLowerCase().includes(search.toLowerCase()) ||
      q.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) return <div style={s.page}><Navbar /><div style={s.centered}>Loading quest board...</div></div>;
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
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <Navbar />

      {/* Accept celebration popup */}
      {acceptedQuest && (
        <AcceptedPopup
          quest={acceptedQuest}
          onOpenChat={() => { setAcceptedQuest(null); alert('Chat feature coming soon!'); }}
          onClose={() => setAcceptedQuest(null)}
        />
      )}

      {/* Quest detail modal — shared component, no showGuildLink since we're already here */}
      {selectedQuest && (
        <QuestDetailModal
          quest={selectedQuest}
          onClose={() => setSelectedQuest(null)}
          currentUserId={user?.id ?? 0}
          onAccept={
            selectedQuest.posterId !== (user?.id ?? 0) && selectedQuest.status === 'OPEN'
              ? () => handleAcceptQuest(selectedQuest.id)
              : undefined
          }
          onComplete={
            selectedQuest.posterId === (user?.id ?? 0) && selectedQuest.status === 'PENDING'
              ? () => handleCompleteQuest(selectedQuest.id)
              : undefined
          }
          onDelete={
            selectedQuest.posterId === (user?.id ?? 0)
              ? () => handleDeleteQuest(selectedQuest.id)
              : undefined
          }
          accepting={accepting === selectedQuest.id}
          completing={completing === selectedQuest.id}
          showGuildLink={false}
        />
      )}

      <main style={s.main}>
        <button style={s.backBtn} onClick={() => navigate('/guilds')}>← My Guilds</button>

        {/* Daily Quote */}
        <div style={s.quoteSection}>
          <div style={s.quoteLabel}>Today's Heroes' Wisdom</div>
          {quoteLoading ? (
            <><div style={s.quoteShimmer} /><div style={{ ...s.quoteShimmer, width: '40%', marginTop: '6px' }} /></>
          ) : quote ? (
            <><div style={s.quoteText}>"{quote.text}"</div><div style={s.quoteAuthor}>–{quote.author}</div></>
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

            <div style={s.filterRow}>
              <div style={s.searchWrap}>
                <svg style={s.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input style={s.searchInput} placeholder="Search quests" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div style={s.statusFilters}>
                {(['ALL', 'OPEN', 'PENDING'] as const).map(f => (
                  <button key={f} style={{ ...s.filterChip, ...(statusFilter === f ? s.filterChipActive : {}) }}
                    onClick={() => setStatusFilter(f)}>
                    {f === 'ALL' ? 'All' : f === 'OPEN' ? 'Open' : 'Pending'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={s.emptyState}>
              <div style={{ fontSize: '44px', opacity: 0.3, marginBottom: '6px' }}>⚔️</div>
              <div style={s.emptyTitle}>No quests here</div>
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
                  currentUserId={user?.id ?? 0}
                  onClick={() => setSelectedQuest(quest)}
                  onDelete={() => handleDeleteQuest(quest.id)}
                  onAccept={() => handleAcceptQuest(quest.id)}
                  onComplete={() => handleCompleteQuest(quest.id)}
                  accepting={accepting === quest.id}
                  completing={completing === quest.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={s.guildFooter}>
          <span style={s.footerItem}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {guild.memberCount} members
          </span>
          <span style={s.footerItem}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            {visibleQuests.filter(q => q.status === 'OPEN').length} open quests
          </span>
          {guild.description && <span style={s.footerDesc}>{guild.description}</span>}
        </div>
      </main>

      {/* Commission Quest Modal */}
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
              {compressingImage ? (
                <div style={{ fontSize: '13px', color: '#888', padding: '8px 0', fontStyle: 'italic' }}>⏳ Processing file...</div>
              ) : attachmentFile ? (
                <div style={s.attachPreviewRow}>
                  <span style={{ fontSize: '18px' }}>{attachmentFile.type.startsWith('image/') ? '🖼️' : '📄'}</span>
                  <span style={s.attachNameText}>{attachmentFile.name}</span>
                  <button style={s.removeBtn} onClick={removeAttachment}>✕</button>
                </div>
              ) : (
                <button style={s.uploadBtn} onClick={() => fileInputRef.current?.click()}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
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
                onClick={handleSubmitQuest} disabled={submitting || compressingImage}>
                {submitting ? 'Posting...' : 'Post Quest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quest Card (board card, not the modal) ────────────────────────────────────

function QuestCard({ quest, currentUserId, onClick, onDelete, onAccept, onComplete, accepting, completing }: {
  quest: Quest; currentUserId: number;
  onClick: () => void; onDelete: () => void; onAccept: () => void; onComplete: () => void;
  accepting: boolean; completing: boolean;
}) {
  const isPaid = quest.questType === 'PAID';
  const isOwn = quest.posterId === currentUserId;
  const isTaken = quest.status === 'PENDING';
  const hasImage = !!(quest.attachmentName?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && !!quest.attachmentData;
  const hasPdf = !!(quest.attachmentName?.match(/\.pdf$/i)) && !!quest.attachmentData;

  return (
    <div style={{
      ...cs.card,
      opacity: (isTaken && !quest.acceptedByMe && !isOwn) ? 0.55 : 1,
      filter: (isTaken && !quest.acceptedByMe && !isOwn) ? 'grayscale(0.3)' : 'none',
    }}>
      <div style={cs.cardClickArea} onClick={onClick}>
        <div style={cs.cardHeader}>
          <QuestIcon size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={cs.cardTitle}>{quest.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '3px' }}>
              <div style={cs.cardCategory}>{quest.category}</div>
              <StatusBadge status={quest.status} />
            </div>
          </div>
        </div>
        <div style={cs.divider} />
        <div style={cs.postedBy}>
          posted by: {quest.postedBy}
          {isTaken && quest.helperUsername && (
            <span style={cs.takenBy}> · taken by {quest.helperUsername}</span>
          )}
        </div>
        <div style={cs.descText}>{quest.description}</div>

        {hasImage && (
          <div style={cs.imageThumbnailWrap} onClick={e => e.stopPropagation()}>
            <img src={quest.attachmentData!} alt={quest.attachmentName!} style={cs.imageThumbnail}
              onClick={onClick} />
          </div>
        )}
        {hasPdf && (
          <div style={cs.pdfBadge} onClick={e => { e.stopPropagation(); downloadPdf(quest.attachmentData!, quest.attachmentName!); }}>
            <span style={{ fontSize: '16px' }}>📄</span>
            <span style={cs.pdfName}>{quest.attachmentName}</span>
            <span style={cs.downloadIcon}>↓</span>
          </div>
        )}
        {quest.attachmentName && !hasImage && !hasPdf && (
          <div style={cs.attachRow}>
            <span style={{ fontSize: '15px' }}>📎</span>
            <span style={cs.attachText}>{quest.attachmentName}</span>
          </div>
        )}
      </div>

      <div style={cs.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          {isPaid ? <span style={cs.paidText}>₱ {Number(quest.reward).toLocaleString()}</span>
                  : <span style={cs.volBadge}>Volunteer</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={cs.xpText}>+{quest.xpReward} XP</span>

          {isOwn && quest.status === 'PENDING' && (
            <button style={cs.completeCardBtn} onClick={e => { e.stopPropagation(); onComplete(); }} disabled={completing}>
              {completing ? '...' : '✓ Mark as Completed'}
            </button>
          )}
          {!isOwn && quest.status === 'OPEN' && (
            <button style={{ ...cs.acceptCardBtn, opacity: accepting ? 0.7 : 1 }}
              onClick={e => { e.stopPropagation(); onAccept(); }} disabled={accepting}>
              {accepting ? '...' : 'Accept'}
            </button>
          )}
          {!isOwn && isTaken && !quest.acceptedByMe && (
            <span style={cs.takenBadge}>Taken</span>
          )}
          {quest.acceptedByMe && (
            <span style={cs.myQuestBadge}>My Quest</span>
          )}
          {isOwn && (
            <button style={cs.deleteCardBtn}
              onClick={e => { e.stopPropagation(); onDelete(); }} title="Delete quest">🗑</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: "'Prompt', sans-serif" },
  centered: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' },
  main: { maxWidth: '800px', margin: '0 auto', padding: '20px 24px 48px' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#52734D', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '13px', padding: '0 0 4px', display: 'inline-flex', alignItems: 'center' },
  quoteSection: { textAlign: 'center', padding: '16px 0 20px' },
  quoteLabel: { color: '#34C759', fontWeight: 700, fontSize: '15px', marginBottom: '8px' },
  quoteText: { color: '#555', fontSize: '14px', fontStyle: 'italic', lineHeight: '1.6', maxWidth: '500px', margin: '0 auto 4px' },
  quoteAuthor: { color: '#999', fontSize: '12px', fontWeight: 500 },
  quoteShimmer: { height: '14px', borderRadius: '6px', background: 'linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', width: '70%', margin: '0 auto' },
  questPanel: { backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid #eee', overflow: 'hidden', marginBottom: '16px' },
  panelHeader: { padding: '16px 20px 14px', borderBottom: '1px solid #f0f0f0' },
  panelTitleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' },
  panelTitle: { color: '#34C759', fontWeight: 700, fontSize: '20px', margin: 0 },
  commissionBtn: { backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '20px', padding: '7px 18px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '13px', cursor: 'pointer', flexShrink: 0 },
  filterRow: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  searchWrap: { position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '200px' },
  searchIcon: { position: 'absolute', left: '11px', pointerEvents: 'none' },
  searchInput: { width: '100%', padding: '8px 12px 8px 32px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontFamily: "'Prompt', sans-serif", fontSize: '13px', outline: 'none', backgroundColor: '#fafafa', boxSizing: 'border-box' },
  statusFilters: { display: 'flex', gap: '6px', flexShrink: 0 },
  filterChip: { background: '#f5f5f5', border: '1.5px solid #e8e8e8', borderRadius: '20px', padding: '5px 12px', fontFamily: "'Prompt', sans-serif", fontSize: '12px', fontWeight: 600, color: '#666', cursor: 'pointer' },
  filterChipActive: { backgroundColor: '#52734D', borderColor: '#52734D', color: '#fff' },
  questGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', padding: '16px 20px 20px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: '8px' },
  emptyTitle: { fontWeight: 700, fontSize: '17px', color: '#666' },
  emptySubtitle: { fontSize: '13px', color: '#bbb', textAlign: 'center', maxWidth: '240px', lineHeight: '1.5' },
  guildFooter: { display: 'flex', alignItems: 'center', gap: '20px', padding: '0 4px', flexWrap: 'wrap' },
  footerItem: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#999', fontWeight: 500 },
  footerDesc: { fontSize: '12px', color: '#bbb', fontStyle: 'italic' },
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
  card: { backgroundColor: '#DDFFBC', borderRadius: '14px', border: '1.5px solid rgba(82,115,77,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'opacity 0.2s, filter 0.2s' },
  cardClickArea: { padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: '12px' },
  cardTitle: { fontWeight: 700, fontSize: '15px', color: '#1a1a1a', lineHeight: '1.3', marginBottom: '2px' },
  cardCategory: { fontSize: '11px', fontWeight: 600, color: '#52734D', textTransform: 'uppercase', letterSpacing: '0.5px' },
  divider: { height: '1px', backgroundColor: 'rgba(82,115,77,0.2)' },
  postedBy: { fontSize: '12px', color: '#666' },
  takenBy: { color: '#92400e', fontWeight: 600 },
  descText: { fontSize: '13px', color: '#555', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  imageThumbnailWrap: { borderRadius: '8px', overflow: 'hidden', border: '1.5px solid rgba(82,115,77,0.25)', lineHeight: 0 },
  imageThumbnail: { width: '100%', maxHeight: '140px', objectFit: 'cover', display: 'block', cursor: 'pointer' },
  pdfBadge: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '8px', border: '1.5px solid rgba(82,115,77,0.2)', cursor: 'pointer' },
  pdfName: { flex: 1, fontSize: '12px', color: '#444', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  downloadIcon: { fontSize: '14px', fontWeight: 700, color: '#52734D', flexShrink: 0 },
  attachRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid rgba(82,115,77,0.2)' },
  attachText: { fontSize: '12px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid rgba(82,115,77,0.15)', backgroundColor: 'rgba(255,255,255,0.3)', gap: '8px' },
  volBadge: { backgroundColor: '#34C759', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' },
  paidText: { fontWeight: 700, fontSize: '14px', color: '#34C759' },
  xpText: { fontWeight: 700, fontSize: '13px', color: '#52734D' },
  deleteCardBtn: { background: 'none', border: '1.5px solid #c73434', borderRadius: '6px', color: '#c73434', fontSize: '13px', padding: '3px 8px', cursor: 'pointer' },
  acceptCardBtn: { backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, padding: '4px 12px', cursor: 'pointer', fontFamily: "'Prompt', sans-serif" },
  completeCardBtn: { backgroundColor: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, padding: '4px 10px', cursor: 'pointer', fontFamily: "'Prompt', sans-serif" },
  takenBadge: { backgroundColor: '#6b7280', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' },
  myQuestBadge: { backgroundColor: '#1e3a5f', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' },
};