// src/pages/PaymentSuccess.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentApi } from '../api/paymentApi';
import Navbar from '../components/Navbar';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'pending' | 'failed'>('verifying');

  useEffect(() => {
    const questId = searchParams.get('quest_id');
    if (!questId) { setStatus('failed'); return; }

    // Give PayMongo a moment to process before we verify
    const timer = setTimeout(() => {
      paymentApi.verifyByQuestId(Number(questId))
        .then(res => {
          const data = res.data?.data as any;
          if (data?.status === 'COMPLETED') {
            setStatus('success');
          } else if (data?.status === 'PENDING') {
            setStatus('pending');
          } else {
            setStatus('failed');
          }
        })
        .catch(() => setStatus('failed'));
    }, 2000); // 2 second delay lets PayMongo finalize

    return () => clearTimeout(timer);
  }, []);

  const questId = searchParams.get('quest_id');

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.center}>

        {status === 'verifying' && (
          <div style={s.card}>
            <div style={s.icon}>⏳</div>
            <h2 style={s.title}>Verifying payment...</h2>
            <p style={s.subtitle}>Please wait while we confirm your payment.</p>
          </div>
        )}

        {status === 'success' && (
          <div style={s.card}>
            <div style={s.icon}>✅</div>
            <h2 style={{ ...s.title, color: '#166534' }}>Quest Published!</h2>
            <p style={s.subtitle}>
              Your payment was confirmed. The quest is now live on the board.
            </p>
            <div style={s.rewardNote}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              The reward is recorded as paid when you mark the quest complete.
            </div>
            <div style={s.btnRow}>
              <button style={s.primaryBtn} onClick={() => navigate('/quests/commissioned')}>
                View My Quests
              </button>
              <button style={s.secondaryBtn} onClick={() => navigate('/guilds')}>
                Back to Guilds
              </button>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div style={s.card}>
            <div style={s.icon}>⏳</div>
            <h2 style={{ ...s.title, color: '#92400e' }}>Payment Processing</h2>
            <p style={s.subtitle}>
              Your payment is still being processed by PayMongo. This can take a moment.
              Check your commissioned quests — it will update automatically once confirmed.
            </p>
            <div style={s.btnRow}>
              <button style={s.primaryBtn} onClick={() => navigate('/quests/commissioned')}>
                Check My Quests
              </button>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div style={s.card}>
            <div style={s.icon}>❌</div>
            <h2 style={{ ...s.title, color: '#c73434' }}>Payment Not Confirmed</h2>
            <p style={s.subtitle}>
              We couldn't verify your payment. The quest has not been published.
              You can try paying again from your commissioned quests.
            </p>
            <div style={s.btnRow}>
              <button style={s.primaryBtn} onClick={() => navigate('/quests/commissioned')}>
                Go to My Quests
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: "'Prompt', sans-serif" },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', padding: '24px' },
  card: { backgroundColor: '#fff', borderRadius: '20px', padding: '48px 40px', maxWidth: '480px', width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.1)', border: '1px solid #eee' },
  icon: { fontSize: '56px', marginBottom: '16px' },
  title: { fontWeight: 700, fontSize: '24px', color: '#1a1a1a', margin: '0 0 12px' },
  subtitle: { fontSize: '14px', color: '#666', lineHeight: '1.6', margin: '0 0 20px' },
  rewardNote: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#DDFFBC', border: '1px solid rgba(82,115,77,0.2)', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', color: '#52734D', fontWeight: 500, marginBottom: '28px' },
  btnRow: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' },
  primaryBtn: { backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 28px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
  secondaryBtn: { backgroundColor: 'transparent', color: '#52734D', border: '1.5px solid #52734D', borderRadius: '12px', padding: '11px 28px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '14px', cursor: 'pointer' },
};