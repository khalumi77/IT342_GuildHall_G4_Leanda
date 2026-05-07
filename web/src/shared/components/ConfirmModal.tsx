import React from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.heading}>{title}</div>
        <div style={styles.message}>{message}</div>
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button style={{ ...styles.confirmBtn, opacity: loading ? 0.7 : 1 }} onClick={onConfirm} disabled={loading}>
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 600,
    padding: '24px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '18px',
    padding: '26px 24px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
    fontFamily: "'Prompt', sans-serif",
  },
  heading: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '12px',
  },
  message: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: 1.7,
    marginBottom: '22px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
  cancelBtn: {
    background: 'none',
    border: '1.5px solid #d1d5db',
    borderRadius: '999px',
    padding: '10px 16px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  confirmBtn: {
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '999px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
