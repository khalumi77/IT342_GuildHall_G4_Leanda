// src/pages/PaymentCancel.tsx
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function PaymentCancel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const questId = searchParams.get('quest_id');

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.center}>
        <div style={s.card}>
          <div style={s.icon}>⚠️</div>
          <h2 style={s.title}>Payment Cancelled</h2>
          <p style={s.subtitle}>
            You cancelled the payment. Your quest has not been published and no charge was made.
            You can try again anytime from your commissioned quests.
          </p>
          <div style={s.btnRow}>
            <button style={s.primaryBtn} onClick={() => navigate('/quests/commissioned')}>
              Go to My Quests
            </button>
            <button style={s.secondaryBtn} onClick={() => navigate('/guilds')}>
              Back to Guilds
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: "'Prompt', sans-serif" },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: '24px' },
  card: {
    backgroundColor: '#fff', borderRadius: '20px', padding: '48px 40px',
    maxWidth: '480px', width: '100%', textAlign: 'center',
    boxShadow: '0 8px 40px rgba(0,0,0,0.1)', border: '1px solid #eee',
  },
  icon: { fontSize: '56px', marginBottom: '16px' },
  title: { fontWeight: 700, fontSize: '24px', color: '#92400e', margin: '0 0 12px' },
  subtitle: { fontSize: '14px', color: '#666', lineHeight: '1.6', margin: '0 0 28px' },
  btnRow: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' },
  primaryBtn: {
    backgroundColor: '#34C759', color: '#fff', border: 'none',
    borderRadius: '12px', padding: '12px 28px',
    fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer',
  },
  secondaryBtn: {
    backgroundColor: 'transparent', color: '#52734D',
    border: '1.5px solid #52734D', borderRadius: '12px', padding: '11px 28px',
    fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '14px', cursor: 'pointer',
  },
};