// src/components/QuestDetailModal.tsx
//
// Reusable quest detail popup used across GuildDashboard, CommissionedQuests,
// and AcceptedQuests. Accepts action callbacks as optional props — pages that
// don't support a given action simply omit the prop and the button won't render.

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuestDetail {
  id: number;
  title: string;
  category: string;
  description: string;
  questType: 'VOLUNTEER' | 'PAID';
  reward: number | null;
  xpReward: number;
  status: 'OPEN' | 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'PENDING_PAYMENT';
  postedBy: string;
  posterId: number;
  createdAt: string | null;
  attachmentName: string | null;
  attachmentData: string | null;
  helperUsername: string | null;
  helperId: number | null;
  acceptedByMe?: boolean;
  // Extra fields present on commissioned/accepted lists
  guildId?: number;
  guildName?: string;
  posterUsername?: string;
}

interface QuestDetailModalProps {
  quest: QuestDetail;
  onClose: () => void;
  currentUserId: number;

  // Optional action handlers — omit to hide the button
  onAccept?: () => void;
  onComplete?: () => void;
  onDelete?: () => void;

  // Loading states
  accepting?: boolean;
  completing?: boolean;
  deleting?: boolean;

  // Show a "Go to Guild" button (omit on GuildDashboard since you're already there)
  showGuildLink?: boolean;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  OPEN:      { label: 'Open',       color: '#166534', bg: '#dcfce7', dot: '●' },
  PENDING:   { label: 'Pending',    color: '#92400e', bg: '#fef3c7', dot: '◐' },
  PENDING_PAYMENT: { label: 'Awaiting Payment', color: '#92400e', bg: '#fef3c7', dot: '💳' },
  COMPLETED: { label: 'Completed',  color: '#1e3a5f', bg: '#dbeafe', dot: '✓' },
  CANCELLED: { label: 'Cancelled',  color: '#6b7280', bg: '#f3f4f6', dot: '✕' },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#555', bg: '#eee', dot: '●' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      backgroundColor: cfg.bg, color: cfg.color,
      fontSize: '11px', fontWeight: 700,
      padding: '2px 9px', borderRadius: '20px', letterSpacing: '0.4px',
    }}>
      {cfg.dot}{'  '}{cfg.label}
    </span>
  );
}

// ── Image Lightbox ────────────────────────────────────────────────────────────

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [posStart, setPosStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.min(8, Math.max(0.5, s - e.deltaY * 0.001)));
  }, []);

  return (
    <div style={lb.overlay} onClick={onClose}>
      <div style={lb.controls} onClick={e => e.stopPropagation()}>
        <button style={lb.ctrlBtn} onClick={() => setScale(s => Math.max(0.5, s - 0.4))}>−</button>
        <span style={lb.zoomLabel}>{Math.round(scale * 100)}%</span>
        <button style={lb.ctrlBtn} onClick={() => setScale(s => Math.min(8, s + 0.4))}>+</button>
        <button style={lb.ctrlBtn} onClick={() => { setScale(1); setPos({ x: 0, y: 0 }); }}>↺</button>
        <button style={{ ...lb.ctrlBtn, marginLeft: '8px' }} onClick={onClose}>✕</button>
      </div>
      <div
        style={{ ...lb.canvas, cursor: dragging ? 'grabbing' : 'grab' }}
        onClick={e => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={e => { setDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); setPosStart({ ...pos }); }}
        onMouseMove={e => { if (!dragging) return; setPos({ x: posStart.x + (e.clientX - dragStart.x), y: posStart.y + (e.clientY - dragStart.y) }); }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        <img src={src} alt={alt} draggable={false} style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          transition: dragging ? 'none' : 'transform 0.15s ease',
          maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain',
          borderRadius: '6px', userSelect: 'none', pointerEvents: 'none',
        }} />
      </div>
      <div style={lb.hint}>Scroll to zoom · Drag to pan · Esc to close</div>
    </div>
  );
}

const lb: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  controls: { position: 'fixed', top: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '8px 12px', zIndex: 2001 },
  ctrlBtn: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: '#fff', width: '34px', height: '34px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' },
  zoomLabel: { color: '#fff', fontSize: '13px', fontWeight: 600, minWidth: '44px', textAlign: 'center', fontFamily: "'Prompt', sans-serif" },
  canvas: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' },
  hint: { position: 'fixed', bottom: '16px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontFamily: "'Prompt', sans-serif", pointerEvents: 'none' },
};

// ── Attachment helpers ────────────────────────────────────────────────────────

function isImage(name: string | null) { return !!name?.match(/\.(jpg|jpeg|png|gif|webp)$/i); }
function isPdf(name: string | null) { return !!name?.match(/\.pdf$/i); }

function downloadPdf(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.target = '_blank'; a.rel = 'noopener noreferrer';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ── Quest Icon ────────────────────────────────────────────────────────────────

function QuestIcon({ size = 52 }: { size?: number }) {
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

// ── Main Modal Component ──────────────────────────────────────────────────────

export default function QuestDetailModal({
  quest,
  onClose,
  currentUserId,
  onAccept,
  onComplete,
  onDelete,
  accepting = false,
  completing = false,
  deleting = false,
  showGuildLink = false,
}: QuestDetailModalProps) {
  const navigate = useNavigate();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState('');

  // Close on Escape (only if lightbox isn't open — lightbox handles its own Escape)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lightboxSrc) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, lightboxSrc]);

  const isPaid = quest.questType === 'PAID';
  const isOwn = quest.posterId === currentUserId;
  const hasImage = isImage(quest.attachmentName) && !!quest.attachmentData;
  const hasPdf = isPdf(quest.attachmentName) && !!quest.attachmentData;

  const isOpen = quest.status === 'OPEN';
  const isPending = quest.status === 'PENDING';
  const isCompleted = quest.status === 'COMPLETED';

  const canAccept = !isOwn && isOpen && !!onAccept;
  const canComplete = isOwn && isPending && !!onComplete;
  const canDelete = isOwn && !!onDelete;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try { return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return ''; }
  };

  return (
    <>
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt={lightboxAlt}
          onClose={() => setLightboxSrc(null)}
        />
      )}

      <div style={m.overlay} onClick={onClose}>
        <div style={m.modal} onClick={e => e.stopPropagation()}>

          {/* Close button */}
          <button style={m.closeBtn} onClick={onClose}>✕</button>

          {/* Header */}
          <div style={m.headerRow}>
            <QuestIcon size={52} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={m.title}>{quest.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                <div style={m.categoryChip}>{quest.category}</div>
                <StatusBadge status={quest.status} />
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div style={m.metaRow}>
            <span style={m.metaItem}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Posted by <strong>{quest.postedBy}</strong>
            </span>
            {quest.guildName && (
              <span style={m.metaItem}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                {quest.guildName}
              </span>
            )}
            {quest.createdAt && (
              <span style={m.metaItem}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {formatDate(quest.createdAt)}
              </span>
            )}
          </div>

          {/* Helper row — who accepted */}
          {quest.helperUsername && (
            <div style={m.helperBanner}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {isPending && <>Accepted by <strong>{quest.helperUsername}</strong></>}
              {isCompleted && <>Completed by <strong>{quest.helperUsername}</strong></>}
            </div>
          )}

          {quest.status === 'PENDING_PAYMENT' && !isOwn && (
            <div style={{ ...m.helperBanner, backgroundColor: '#fef3c7', border: '1px solid #fde68a', color: '#92400e' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              This quest is awaiting payment from the commissioner before it goes live.
              Message them to discuss the reward.
            </div>
          )}

          <div style={m.divider} />

          {/* Description */}
          <div style={m.descLabel}>Description</div>
          <div style={m.descText}>{quest.description}</div>

          {/* Image attachment */}
          {hasImage && (
            <div style={m.imageWrap}>
              <div style={m.imageLabelRow}>
                <span style={m.attachLabel}>📷 {quest.attachmentName}</span>
                <span style={m.expandHint}>Click to expand & zoom</span>
              </div>
              <img
                src={quest.attachmentData!}
                alt={quest.attachmentName!}
                style={m.imagePreview}
                onClick={() => { setLightboxSrc(quest.attachmentData!); setLightboxAlt(quest.attachmentName!); }}
                title="Click to expand"
              />
            </div>
          )}

          {/* PDF attachment */}
          {hasPdf && (
            <div style={m.pdfWrap}>
              <div style={m.pdfIcon}>📄</div>
              <div style={m.pdfInfo}>
                <div style={m.pdfFilename}>{quest.attachmentName}</div>
                <div style={m.pdfSubtext}>PDF Document</div>
              </div>
              <button style={m.pdfDownloadBtn} onClick={() => downloadPdf(quest.attachmentData!, quest.attachmentName!)}>
                ↓ Download
              </button>
            </div>
          )}

          {/* Other attachment */}
          {quest.attachmentName && !hasImage && !hasPdf && (
            <div style={m.attachBox}>
              <span style={{ fontSize: '22px' }}>📎</span>
              <div style={{ flex: 1 }}>
                <div style={m.pdfFilename}>{quest.attachmentName}</div>
              </div>
            </div>
          )}

          {/* Completed banner */}
          {isCompleted && (
            <div style={m.completedBanner}>
              ✓ This quest has been completed!
            </div>
          )}

          {/* Footer: actions + reward */}
          <div style={m.footer}>
            <div style={m.actionGroup}>
              {/* Accept (non-owner, OPEN quests in guild dashboard) */}
              {canAccept && (
                <button
                  style={{ ...m.acceptBtn, opacity: accepting ? 0.7 : 1 }}
                  onClick={onAccept}
                  disabled={accepting}
                >
                  {accepting ? 'Accepting...' : '⚔️ Accept Quest'}
                </button>
              )}

              {/* Mark complete (commissioner, PENDING) */}
              {canComplete && (
                <button
                  style={{ ...m.completeBtn, opacity: completing ? 0.7 : 1 }}
                  onClick={onComplete}
                  disabled={completing}
                >
                  {completing ? 'Marking...' : '✓ Mark as Completed'}
                </button>
              )}

              {/* Taken by someone else */}
              {!isOwn && isPending && !quest.acceptedByMe && (
                <span style={m.takenInfo}>This quest has been taken by someone else.</span>
              )}

              {/* Accepted by me */}
              {quest.acceptedByMe && !isCompleted && (
                <span style={m.myQuestInfo}>✓ You accepted this quest</span>
              )}

              {/* Delete (commissioner, OPEN quests only — can't delete once someone accepted) */}
              {canDelete && isOpen && (
                <button
                  style={{ ...m.deleteBtn, opacity: deleting ? 0.7 : 1 }}
                  onClick={onDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : '🗑 Delete Quest'}
                </button>
              )}

              {/* Go to Guild button (shown on commissioned/accepted pages) */}
              {showGuildLink && quest.guildId && (
                <button
                  style={m.guildLinkBtn}
                  onClick={() => { onClose(); navigate(`/guilds/${quest.guildId}`); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  Go to Guild
                </button>
              )}

              {quest.status === 'PENDING_PAYMENT' && !isOwn && (
                <button
                  style={{
                    ...m.guildLinkBtn,
                    backgroundColor: '#52734D', color: '#fff', border: 'none',
                  }}
                  onClick={() => {
                    onClose();
                    // Navigate to chat — the poster's userId is quest.posterId
                    window.location.href = `/chat`;
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Message Commissioner
                </button>
              )}
            </div>

            {/* Reward */}
            <div style={m.rewardGroup}>
              <span style={m.rewardLabel}>Reward:</span>
              {isPaid
                ? <span style={m.paidText}>₱ {Number(quest.reward).toLocaleString()}</span>
                : <span style={m.volBadge}>Volunteer</span>}
              <span style={m.xpText}>+{quest.xpReward} XP</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const m: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 400, padding: '20px',
  },
  modal: {
    backgroundColor: '#DDFFBC', borderRadius: '20px',
    width: '100%', maxWidth: '560px', maxHeight: '88vh', overflowY: 'auto',
    boxShadow: '0 24px 80px rgba(0,0,0,0.25)', padding: '28px',
    position: 'relative', fontFamily: "'Prompt', sans-serif",
  },
  closeBtn: {
    position: 'absolute', top: '16px', right: '16px',
    background: '#c73434', border: 'none', borderRadius: '8px',
    width: '30px', height: '30px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: '14px',
  },
  headerRow: { display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '12px' },
  title: { fontWeight: 700, fontSize: '20px', color: '#1a1a1a', lineHeight: '1.3', marginBottom: '4px' },
  categoryChip: {
    fontSize: '11px', fontWeight: 600, color: '#52734D',
    textTransform: 'uppercase', letterSpacing: '0.8px',
    backgroundColor: 'rgba(82,115,77,0.15)', padding: '3px 10px',
    borderRadius: '20px', display: 'inline-block',
  },
  metaRow: {
    display: 'flex', alignItems: 'center', gap: '16px',
    flexWrap: 'wrap', marginBottom: '10px',
  },
  metaItem: {
    display: 'flex', alignItems: 'center', gap: '5px',
    fontSize: '12px', color: '#666',
  },
  helperBanner: {
    display: 'flex', alignItems: 'center', gap: '6px',
    backgroundColor: 'rgba(82,115,77,0.12)',
    border: '1px solid rgba(82,115,77,0.25)',
    borderRadius: '8px', padding: '7px 12px',
    fontSize: '13px', color: '#52734D', marginBottom: '10px',
  },
  divider: { height: '1.5px', backgroundColor: 'rgba(82,115,77,0.25)', marginBottom: '14px' },
  descLabel: { fontWeight: 700, fontSize: '14px', color: '#333', marginBottom: '6px' },
  descText: { fontSize: '14px', color: '#444', lineHeight: '1.65', marginBottom: '16px' },
  imageWrap: { marginBottom: '16px' },
  imageLabelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
  attachLabel: { fontSize: '13px', fontWeight: 600, color: '#52734D' },
  expandHint: { fontSize: '11px', color: '#888', fontStyle: 'italic' },
  imagePreview: {
    width: '100%', maxHeight: '300px', objectFit: 'contain',
    borderRadius: '10px', cursor: 'zoom-in',
    border: '1.5px solid rgba(82,115,77,0.2)',
    backgroundColor: '#fff', display: 'block',
  },
  pdfWrap: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '14px 16px', marginBottom: '16px',
    backgroundColor: '#fff', borderRadius: '12px',
    border: '1.5px solid rgba(82,115,77,0.2)',
  },
  pdfIcon: { fontSize: '32px', flexShrink: 0 },
  pdfInfo: { flex: 1, minWidth: 0 },
  pdfFilename: { fontWeight: 600, fontSize: '14px', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pdfSubtext: { fontSize: '12px', color: '#888', marginTop: '2px' },
  pdfDownloadBtn: {
    backgroundColor: '#52734D', color: '#fff', border: 'none',
    borderRadius: '10px', padding: '8px 16px',
    fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '13px',
    cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
  },
  attachBox: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '12px 14px', backgroundColor: '#fff',
    borderRadius: '10px', border: '1px solid rgba(82,115,77,0.2)', marginBottom: '16px',
  },
  completedBanner: {
    backgroundColor: '#dbeafe', border: '1px solid #93c5fd',
    borderRadius: '10px', padding: '10px 14px',
    fontSize: '14px', fontWeight: 600, color: '#1e3a5f',
    marginBottom: '16px', textAlign: 'center',
  },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '12px', flexWrap: 'wrap', paddingTop: '12px',
    borderTop: '1.5px solid rgba(82,115,77,0.2)',
  },
  actionGroup: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  acceptBtn: {
    backgroundColor: '#34C759', color: '#fff', border: 'none',
    borderRadius: '10px', padding: '10px 22px',
    fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer',
  },
  completeBtn: {
    backgroundColor: '#1e3a5f', color: '#fff', border: 'none',
    borderRadius: '10px', padding: '10px 18px',
    fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer',
  },
  deleteBtn: {
    backgroundColor: 'transparent', color: '#c73434',
    border: '1.5px solid #c73434', borderRadius: '10px', padding: '9px 18px',
    fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer',
  },
  guildLinkBtn: {
    backgroundColor: 'transparent', color: '#52734D',
    border: '1.5px solid #52734D', borderRadius: '10px', padding: '9px 16px',
    fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '13px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  myQuestInfo: { fontSize: '13px', fontWeight: 600, color: '#1e3a5f' },
  takenInfo: { fontSize: '13px', color: '#92400e', fontWeight: 500 },
  rewardGroup: { display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' },
  rewardLabel: { fontWeight: 700, fontSize: '14px', color: '#333' },
  volBadge: {
    backgroundColor: '#34C759', color: '#fff',
    fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px',
  },
  paidText: { fontWeight: 700, fontSize: '16px', color: '#34C759' },
  xpText: { fontWeight: 700, fontSize: '14px', color: '#52734D' },
};