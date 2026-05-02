// src/pages/CommissionedQuests.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/authApi';
import { supabase } from '../api/supabaseClient';
import QuestDetailModal, { type QuestDetail, StatusBadge } from '../components/QuestDetailModal';
import { useAuth } from '../context/AuthContext';
import { paymentApi } from '../api/paymentApi';

type CommissionedQuest = QuestDetail & {
  guildId: number;
  guildName: string;
};

const CATEGORIES = ['Design', 'Academic', 'Manual Labor', 'Tutoring', 'Media', 'IT/Tech', 'Writing'];

interface QuestFormState {
  title: string;
  category: string;
  description: string;
  questType: 'VOLUNTEER' | 'PAID';
  reward: string;
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
  const { user } = useAuth();
  const [quests, setQuests] = useState<CommissionedQuest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING_PAYMENT' | 'OPEN' | 'PENDING' | 'COMPLETED'>('ALL');
  const [payingId, setPayingId] = useState<number | null>(null);

  // Detail modal
  const [selectedQuest, setSelectedQuest] = useState<CommissionedQuest | null>(null);
  const [completing, setCompleting] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [completeTarget, setCompleteTarget] = useState<CommissionedQuest | null>(null);

  // Edit modal
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingQuest, setEditingQuest] = useState<CommissionedQuest | null>(null);
  const [editForm, setEditForm] = useState<QuestFormState>({ title: '', category: '', description: '', questType: 'VOLUNTEER', reward: '' });
  const [editAttachmentFile, setEditAttachmentFile] = useState<File | null>(null);
  const [editAttachmentPreview, setEditAttachmentPreview] = useState<string | null>(null);
  const [editCompressing, setEditCompressing] = useState(false);
  const [editFormError, setEditFormError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editAttachmentCleared, setEditAttachmentCleared] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    api.get('/quests/mine')
      .then(res => {
        const data = res.data?.data ?? res.data;
        setQuests(Array.isArray(data) ? data : []);
      })
      .catch(() => setQuests([]))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Open edit form ──────────────────────────────────────────────────────────

  const openEditForm = (quest: CommissionedQuest) => {
    setEditingQuest(quest);
    setEditForm({
      title: quest.title,
      category: quest.category,
      description: quest.description,
      questType: quest.questType,
      reward: quest.reward != null ? String(quest.reward) : '',
    });
    setEditAttachmentFile(null);
    setEditAttachmentPreview(quest.attachmentData ?? null);
    setEditAttachmentCleared(false);
    setEditFormError('');
    setSelectedQuest(null);
    setShowEditForm(true);
  };

  const closeEditForm = () => {
    setShowEditForm(false);
    setEditingQuest(null);
    setEditAttachmentFile(null);
    setEditAttachmentPreview(null);
    setEditAttachmentCleared(false);
    setEditFormError('');
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  // ── File handling ───────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPDF = file.type === 'application/pdf';
    if (isPDF) {
      if (file.size > 500 * 1024) { setEditFormError('PDF must be under 500 KB.'); return; }
      setEditAttachmentFile(file);
      setEditAttachmentCleared(false);
      const reader = new FileReader();
      reader.onload = () => setEditAttachmentPreview(reader.result as string);
      reader.readAsDataURL(file);
      return;
    }
    if (file.size > 10 * 1024 * 1024) { setEditFormError('Image must be under 10 MB.'); return; }
    setEditAttachmentFile(file);
    setEditAttachmentCleared(false);
    setEditCompressing(true);
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
      setEditAttachmentPreview(canvas.toDataURL('image/jpeg', 0.7));
      setEditCompressing(false);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => { setEditAttachmentPreview(reader.result as string); setEditCompressing(false); };
      reader.readAsDataURL(file);
    };
    img.src = objectUrl;
  };

  const removeAttachment = () => {
    setEditAttachmentFile(null);
    setEditAttachmentPreview(null);
    setEditAttachmentCleared(true);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  // ── Submit edit ─────────────────────────────────────────────────────────────

  const handleSubmitEdit = async () => {
    if (!editingQuest) return;
    setEditFormError('');
    if (!editForm.title.trim()) { setEditFormError('Quest title is required.'); return; }
    if (!editForm.category) { setEditFormError('Please select a category.'); return; }
    if (!editForm.description.trim()) { setEditFormError('Description is required.'); return; }
    if (editForm.questType === 'PAID' && (!editForm.reward || isNaN(Number(editForm.reward)) || Number(editForm.reward) <= 0)) {
      setEditFormError('Please enter a valid payment amount.'); return;
    }
    setEditSubmitting(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentFileName: string | null = null;

      if (editAttachmentFile) {
        setEditCompressing(true);
        const ext = editAttachmentFile.name.split('.').pop();
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = `guild-${editingQuest.guildId}/${uniqueName}`;
        const { error: uploadError } = await supabase.storage
          .from('quest-attachments')
          .upload(filePath, editAttachmentFile, { upsert: false });
        setEditCompressing(false);
        if (uploadError) { setEditFormError(`File upload failed: ${uploadError.message}`); setEditSubmitting(false); return; }
        const { data: urlData } = supabase.storage.from('quest-attachments').getPublicUrl(filePath);
        attachmentUrl = urlData.publicUrl;
        attachmentFileName = editAttachmentFile.name;
      } else if (editAttachmentCleared) {
        attachmentUrl = null;
        attachmentFileName = null;
      } else {
        attachmentUrl = editingQuest.attachmentData ?? null;
        attachmentFileName = editingQuest.attachmentName ?? null;
      }

      const payload: Record<string, unknown> = {
        title: editForm.title.trim(),
        category: editForm.category,
        description: editForm.description.trim(),
        questType: editForm.questType,
        reward: editForm.questType === 'PAID' ? Number(editForm.reward) : null,
        attachmentName: attachmentFileName,
        attachmentPath: attachmentUrl,
      };

      const res = await api.put(`/guilds/${editingQuest.guildId}/quests/${editingQuest.id}`, payload);
      const updated = res.data?.data ?? res.data;

      setQuests(prev => prev.map(q =>
        q.id === editingQuest.id
          ? { ...q, ...updated, attachmentData: attachmentUrl ?? null, attachmentName: attachmentFileName ?? null }
          : q
      ));
      closeEditForm();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setEditFormError(e?.response?.data?.error?.message || 'Failed to update quest.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Complete / Delete ───────────────────────────────────────────────────────

  const handleComplete = (quest: CommissionedQuest) => {
    // Show custom confirm modal instead of browser confirm()
    setCompleteTarget(quest);
    setSelectedQuest(null); // close detail modal if open
  };

  const confirmComplete = async () => {
    if (!completeTarget) return;
    setCompleting(completeTarget.id);
    setCompleteTarget(null);
    try {
      const res = await api.post(`/guilds/${completeTarget.guildId}/quests/${completeTarget.id}/complete`);
      const updated = res.data?.data ?? res.data;
      setQuests(prev => prev.map(q => q.id === completeTarget.id ? { ...q, ...updated } : q));
      setSelectedQuest(prev => prev?.id === completeTarget.id ? { ...prev, ...updated } : prev);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      alert(e?.response?.data?.error?.message || 'Failed to mark quest complete.');
    } finally {
      setCompleting(null);
    }
  };

  const handleDelete = async (quest: CommissionedQuest) => {
    if (!window.confirm(`Delete "${quest.title}"? This cannot be undone.`)) return;
    setDeleting(quest.id);
    try {
      await api.delete(`/guilds/${quest.guildId}/quests/${quest.id}`);
      setQuests(prev => prev.filter(q => q.id !== quest.id));
      setSelectedQuest(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      alert(e?.response?.data?.error?.message || 'Failed to delete quest.');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try { return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return ''; }
  };

  const handlePay = async (quest: CommissionedQuest) => {
  setPayingId(quest.id);
  try {
    const res = await paymentApi.createSession(quest.id);
    const { checkoutUrl } = res.data.data;
    // Redirect to Stripe Checkout
    window.location.href = checkoutUrl;
  } catch (err: any) {
    alert(err?.response?.data?.error?.message || 'Failed to initiate payment.');
    setPayingId(null);
  }
};

  const filtered = quests.filter(q => filter === 'ALL' || q.status === filter);
  const openCount = quests.filter(q => q.status === 'OPEN').length;
  const pendingCount = quests.filter(q => q.status === 'PENDING').length;
  const completedCount = quests.filter(q => q.status === 'COMPLETED').length;

  // Edit attachment display helpers
  const editAttachDisplayName = editAttachmentFile?.name ?? (editAttachmentPreview ? 'Existing attachment' : null);
  const editAttachIsImage = editAttachDisplayName ? /\.(jpg|jpeg|png|gif|webp)$/i.test(editAttachDisplayName) : false;

  // Notice banner for the edit modal — amber for pending, blue for open
  const editNotice = editingQuest?.status === 'PENDING'
    ? { text: `⚠️ This quest is in progress — ${editingQuest.helperUsername ?? 'the helper'} will be notified of your changes via chat.`, bg: '#fef3c7', border: '#fde68a', color: '#92400e' }
    : { text: '✏️ Only open and pending quests can be edited.', bg: '#f0f9ff', border: '#bae6fd', color: '#0369a1' };

  return (
    <div style={s.page}>
      <Navbar />

      {/* Quest detail modal */}
      {selectedQuest && (
        <QuestDetailModal
          quest={selectedQuest}
          onClose={() => setSelectedQuest(null)}
          currentUserId={user?.id ?? 0}
          onComplete={
            selectedQuest.status === 'PENDING' && selectedQuest.helperUsername
              ? () => handleComplete(selectedQuest)
              : undefined
          }
          onDelete={
            selectedQuest.status === 'OPEN'
              ? () => handleDelete(selectedQuest)
              : undefined
          }
          completing={completing === selectedQuest.id}
          deleting={deleting === selectedQuest.id}
          showGuildLink={true}
        />
      )}

      {/* Complete quest confirmation modal */}
      {completeTarget && (
        <CompleteConfirmModal
          quest={completeTarget}
          onConfirm={confirmComplete}
          onCancel={() => setCompleteTarget(null)}
        />
      )}

      {/* ── Edit Quest Modal ── */}
      {showEditForm && editingQuest && (
        <div style={s.overlay} onClick={closeEditForm}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Edit Quest</h2>
              <button style={s.closeXBtn} onClick={closeEditForm}>✕</button>
            </div>

            {/* Context notice */}
            <div style={{ backgroundColor: editNotice.bg, border: `1px solid ${editNotice.border}`, borderRadius: '8px', padding: '9px 13px', fontSize: '13px', color: editNotice.color, marginBottom: '14px', marginTop: '10px', lineHeight: '1.5' }}>
              {editNotice.text}
            </div>

            {editFormError && <div style={s.errorBox}>{editFormError}</div>}

            {/* Title */}
            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>Quest Title <span style={{ color: '#c73434' }}>*</span></label>
              <input
                style={s.fieldInput}
                placeholder="Enter quest title here"
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                maxLength={100}
              />
            </div>

            {/* Category */}
            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>Category <span style={{ color: '#c73434' }}>*</span></label>
              <div style={s.categoryGrid}>
                {CATEGORIES.map(cat => (
                  <label key={cat} style={s.categoryOption}>
                    <input
                      type="radio"
                      name="cat-edit-cq"
                      value={cat}
                      checked={editForm.category === cat}
                      onChange={() => setEditForm(f => ({ ...f, category: cat }))}
                      style={{ accentColor: '#34C759', marginRight: '5px' }}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            {/* Attachment */}
            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>
                File Attachment <span style={{ color: '#aaa', fontWeight: 400, fontSize: '12px' }}>(optional)</span>
              </label>
              {editCompressing ? (
                <div style={{ fontSize: '13px', color: '#888', padding: '8px 0', fontStyle: 'italic' }}>⏳ Processing file...</div>
              ) : editAttachDisplayName ? (
                <div style={s.attachPreviewRow}>
                  <span style={{ fontSize: '18px' }}>{editAttachIsImage ? '🖼️' : '📄'}</span>
                  <span style={s.attachNameText}>{editAttachDisplayName}</span>
                  <button style={s.removeBtn} onClick={removeAttachment}>✕</button>
                </div>
              ) : (
                <button style={s.uploadBtn} onClick={() => editFileInputRef.current?.click()}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload
                </button>
              )}
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}>Images or PDF · max 5MB</div>
            </div>

            {/* Description */}
            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>Description <span style={{ color: '#c73434' }}>*</span></label>
              <textarea
                style={s.fieldTextarea}
                placeholder="Describe the quest in detail..."
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                maxLength={1000}
              />
              <div style={{ fontSize: '11px', color: '#bbb', textAlign: 'right', marginTop: '3px' }}>
                {editForm.description.length}/1000
              </div>
            </div>

            {/* Reward type */}
            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>Reward Type <span style={{ color: '#c73434' }}>*</span></label>
              <div style={s.rewardTypeRow}>
                <label style={s.rewardOption}>
                  <input
                    type="radio"
                    name="rewardType-edit-cq"
                    checked={editForm.questType === 'VOLUNTEER'}
                    onChange={() => setEditForm(f => ({ ...f, questType: 'VOLUNTEER', reward: '' }))}
                    style={{ accentColor: '#34C759', marginRight: '6px' }}
                  />
                  Volunteer
                </label>
                <label style={s.rewardOption}>
                  <input
                    type="radio"
                    name="rewardType-edit-cq"
                    checked={editForm.questType === 'PAID'}
                    onChange={() => setEditForm(f => ({ ...f, questType: 'PAID' }))}
                    style={{ accentColor: '#34C759', marginRight: '6px' }}
                  />
                  Payment
                </label>
                {editForm.questType === 'PAID' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
                    <span style={{ fontWeight: 700, color: '#52734D', fontSize: '15px' }}>₱</span>
                    <input
                      style={s.paymentInput}
                      type="number"
                      min="1"
                      placeholder="Offered amount"
                      value={editForm.reward}
                      onChange={e => setEditForm(f => ({ ...f, reward: e.target.value }))}
                    />
                  </div>
                )}
              </div>
              <div style={s.xpNote}>✦ All quests award <strong>+20 XP</strong> upon completion</div>
            </div>

            {/* Footer */}
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={closeEditForm}>Cancel</button>
              <button
                style={{ ...s.saveBtn, opacity: editSubmitting || editCompressing ? 0.7 : 1 }}
                onClick={handleSubmitEdit}
                disabled={editSubmitting || editCompressing}
              >
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
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
          {(['ALL', 'PENDING_PAYMENT', 'OPEN', 'PENDING', 'COMPLETED'] as const).map(f => (
            <button key={f} style={{ ...s.tab, ...(filter === f ? s.tabActive : {}) }}
              onClick={() => setFilter(f)}>
              {f === 'ALL' ? `All (${quests.length})` :
              f === 'PENDING_PAYMENT' ? `Unpaid (${quests.filter(q => q.status === 'PENDING_PAYMENT').length})` :
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
              {filter === 'ALL'
                ? 'Head to a guild and click "Commission Quest" to post your first quest.'
                : 'Try switching to a different filter.'}
            </div>
            {filter === 'ALL' && (
              <button style={s.browseBtn} onClick={() => navigate('/guilds')}>Go to My Guilds</button>
            )}
          </div>
        ) : (
          <div style={s.list}>
            {filtered.map(quest => {
              const canEdit = quest.status === 'OPEN' || quest.status === 'PENDING';
              return (
                <div key={quest.id} style={s.card}>
                  {/* Left clickable area → detail modal */}
                  <div style={s.cardMain} onClick={() => setSelectedQuest(quest)}>
                    <QuestIcon size={40} />
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
                        {quest.createdAt && (
                          <span style={s.dateMeta}>{formatDate(quest.createdAt)}</span>
                        )}
                      </div>

                      {quest.helperUsername ? (
                        <div style={s.helperRow}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                          {quest.status === 'COMPLETED' ? 'Completed by' : 'Accepted by'}{' '}
                          <strong style={{ color: '#52734D' }}>{quest.helperUsername}</strong>
                        </div>
                      ) : quest.status === 'OPEN' ? (
                        <div style={s.waitingRow}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                          Waiting for an adventurer...
                        </div>
                      ) : null}

                      <div style={s.cardDesc}>{quest.description}</div>
                    </div>
                  </div>

                  {/* Right column — reward + actions */}
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

                    {quest.status === 'PENDING_PAYMENT' && (
                      <button
                        style={{
                          ...s.payBtn,
                          opacity: payingId === quest.id ? 0.7 : 1,
                          cursor: payingId === quest.id ? 'not-allowed' : 'pointer',
                        }}
                        onClick={e => { e.stopPropagation(); handlePay(quest); }}
                        disabled={payingId === quest.id}
                      >
                        {payingId === quest.id ? '⏳ Redirecting...' : '💳 Pay to Publish'}
                      </button>
                    )}

                    <div style={s.actionBtns}>
                      {/* Edit button — OPEN or PENDING */}
                      {canEdit && (
                        <button
                          style={s.editBtn}
                          onClick={e => { e.stopPropagation(); openEditForm(quest); }}
                          title={quest.status === 'PENDING' ? 'Edit quest (helper will be notified)' : 'Edit quest'}
                        >
                          ✏️ Edit
                          {quest.status === 'PENDING' && (
                            <span style={s.editPendingDot} title="Helper will be notified" />
                          )}
                        </button>
                      )}
                      <div
                        style={s.viewHint}
                        onClick={() => setSelectedQuest(quest)}
                      >
                        View →
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
  cardMain: { display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 18px', flex: 1, minWidth: 0, cursor: 'pointer' },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: { fontWeight: 700, fontSize: '15px', color: '#1a1a1a', marginBottom: '6px', lineHeight: '1.3' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' },
  categoryChip: { fontSize: '11px', fontWeight: 600, color: '#52734D', textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: 'rgba(82,115,77,0.15)', padding: '2px 8px', borderRadius: '20px' },
  guildChip: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: 600, color: '#52734D', backgroundColor: 'rgba(82,115,77,0.08)', padding: '2px 8px', borderRadius: '20px' },
  dateMeta: { fontSize: '12px', color: '#888' },
  helperRow: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#555', marginBottom: '4px', backgroundColor: 'rgba(82,115,77,0.1)', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' },
  waitingRow: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#aaa', marginBottom: '4px', fontStyle: 'italic' },
  cardDesc: { fontSize: '13px', color: '#555', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', padding: '14px 16px', borderLeft: '1px solid rgba(82,115,77,0.15)', backgroundColor: 'rgba(255,255,255,0.35)', minWidth: '130px', flexShrink: 0 },
  rewardSection: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' },
  volBadge: { backgroundColor: '#34C759', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' },
  paidText: { fontWeight: 700, fontSize: '15px', color: '#34C759' },
  xpText: { fontWeight: 700, fontSize: '12px', color: '#52734D' },
  attachBadge: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#666', maxWidth: '120px' },
  attachName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  actionBtns: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' },
  editBtn: { position: 'relative', backgroundColor: '#52734D', color: '#fff', border: 'none', borderRadius: '8px', padding: '5px 12px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  editPendingDot: { width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#fbbf24', display: 'inline-block', flexShrink: 0 },
  viewHint: { fontSize: '12px', color: '#52734D', fontWeight: 600, cursor: 'pointer' },

  // Modal styles
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
  saveBtn: { backgroundColor: '#52734D', color: '#fff', border: 'none', borderRadius: '20px', padding: '9px 24px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
};

// ── Quest Completion Confirm Modal ────────────────────────────────────────────

function CompleteConfirmModal({ quest, onConfirm, onCancel }: {
  quest: { title: string; helperUsername: string | null; questType: string; reward: number | null; xpReward: number };
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isPaid = quest.questType === 'PAID';

  return (
    <div style={cm.overlay} onClick={onCancel}>
      <div style={cm.modal} onClick={e => e.stopPropagation()}>
        <div style={cm.iconWrap}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>

        <h2 style={cm.title}>Mark Quest as Complete?</h2>

        <div style={cm.questName}>"{quest.title}"</div>

        <p style={cm.body}>
          Confirming this means <strong>{quest.helperUsername ?? 'the helper'}</strong> successfully
          completed the work. They'll receive an automated reward summary in chat.
        </p>

        <div style={cm.rewardBox}>
          <div style={cm.rewardLabel}>Rewards to be granted:</div>
          <div style={cm.rewardRow}>
            <span style={cm.rewardItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              +{quest.xpReward ?? 20} XP
            </span>
            {isPaid && quest.reward != null ? (
              <span style={cm.rewardItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 6H8a2 2 0 0 0 0 4h8"/>
                  <path d="M17 14H8a2 2 0 0 0 0 4h5"/>
                </svg>
                ₱{Number(quest.reward).toLocaleString()}
              </span>
            ) : (
              <span style={{ ...cm.rewardItem, color: '#888', fontWeight: 500, fontSize: '13px' }}>
                Volunteer quest — no monetary reward
              </span>
            )}
          </div>
        </div>

        <div style={cm.actions}>
          <button style={cm.cancelBtn} onClick={onCancel}>Cancel</button>
          <button style={cm.confirmBtn} onClick={onConfirm}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Yes, Mark Complete
          </button>
        </div>
      </div>
    </div>
  );
}

const cm: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 600, padding: '24px',
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '20px', padding: '32px 28px',
    maxWidth: '420px', width: '100%',
    boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
    fontFamily: "'Prompt', sans-serif",
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
    gap: '14px',
  },
  iconWrap: {
    width: '60px', height: '60px', borderRadius: '50%',
    backgroundColor: '#DDFFBC',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '4px',
  },
  title: { fontWeight: 700, fontSize: '20px', color: '#1a1a1a', margin: 0 },
  questName: {
    fontSize: '14px', color: '#52734D', fontWeight: 600,
    backgroundColor: '#DDFFBC', padding: '6px 16px', borderRadius: '20px',
  },
  body: { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: 0 },
  rewardBox: {
    width: '100%', backgroundColor: '#f9fdf5',
    border: '1.5px solid #DDFFBC', borderRadius: '12px',
    padding: '14px 18px', textAlign: 'left',
  },
  rewardLabel: {
    fontSize: '11px', fontWeight: 700, color: '#52734D',
    textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px',
  },
  rewardRow: { display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' },
  rewardItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 700, color: '#34C759' },
  actions: { display: 'flex', gap: '12px', width: '100%', marginTop: '4px' },
  cancelBtn: {
    flex: 1, background: 'none', border: '1.5px solid #ddd',
    borderRadius: '12px', padding: '12px',
    fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '14px',
    color: '#666', cursor: 'pointer',
  },
  confirmBtn: {
    flex: 2, backgroundColor: '#34C759', color: '#fff',
    border: 'none', borderRadius: '12px', padding: '12px 20px',
    fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '8px',
  },
};