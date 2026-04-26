// src/pages/UserProfileView.tsx
// Read-only profile view — used by admins to view any user's profile.
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/authApi';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRank(level: number): string {
  if (level >= 71) return 'Adamantite';
  if (level >= 51) return 'Mithril';
  if (level >= 31) return 'Gold';
  if (level >= 21) return 'Silver';
  return 'Bronze';
}

function getRankColor(rank: string): string {
  switch (rank) {
    case 'Adamantite': return '#4FC3F7';
    case 'Mithril':    return '#CE93D8';
    case 'Gold':       return '#FFD54F';
    case 'Silver':     return '#B0BEC5';
    default:           return '#A1887F';
  }
}

const XP_PER_LEVEL = 100;

function xpProgress(totalXp: number, level: number) {
  const current = Math.max(0, totalXp - (level - 1) * XP_PER_LEVEL);
  return { current, needed: XP_PER_LEVEL, percent: Math.min(100, (current / XP_PER_LEVEL) * 100) };
}

const SKILL_EMOJI: Record<string, string> = {
  Design: '🎨', Academic: '📚', Caregiving: '🤝', Writing: '✍️', Media: '🎤',
  'Manual Labor': '💪', Tutoring: '🎓', 'IT/Tech': '💻',
};

// ── Component ──────────────────────────────────────────────────────────────────

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  level: number;
  xp: number;
  rank: string;
  skills: string[];
  bio?: string;
  profilePictureUrl?: string;
  googleSub?: string;
}

export default function UserProfileView() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) { setNotFound(true); setIsLoading(false); return; }
    setIsLoading(true);
    api.get(`/admin/users/${userId}`)
      .then(res => {
        const raw = res.data?.data ?? res.data;
        setProfile(raw);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <div style={styles.page}>
        <Navbar />
        <div style={styles.centered}>Loading profile...</div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div style={styles.page}>
        <Navbar />
        <div style={styles.centered}>
          <div style={styles.notFoundText}>Adventurer not found.</div>
          <button style={styles.backBtn} onClick={() => navigate('/admin')}>← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const rank = getRank(profile.level);
  const rankColor = getRankColor(rank);
  const xp = xpProgress(profile.xp, profile.level);
  const isGoogleLinked = !!profile.googleSub;
  const isGuildmaster = profile.role === 'ROLE_GUILDMASTER';

  return (
    <div style={styles.page}>
      <Navbar />

      <main style={styles.main}>
        {/* Back button */}
        <button style={styles.backBtn} onClick={() => navigate('/admin')}>
          ← Back to Dashboard
        </button>

        {/* Read-only notice */}
        <div style={styles.viewingBanner}>
          👁 Viewing profile as Guildmaster — read only
        </div>

        {/* Profile Card */}
        <div style={styles.profileCard}>
          <div style={styles.avatarSection}>
            <div style={styles.avatarWrap}>
              {profile.profilePictureUrl ? (
                <img src={profile.profilePictureUrl} alt="avatar" style={styles.avatarImg} />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
              )}
            </div>

            <div style={styles.nameSection}>
              <div style={styles.username}>{profile.username}</div>
              <div style={styles.levelRow}>
                <span style={styles.levelBadge}>Level {profile.level}</span>
                {isGuildmaster && <span style={styles.gmBadge}>Guildmaster</span>}
              </div>
            </div>
          </div>

          <div style={styles.rankSection}>
            <div style={styles.rankRow}>
              <span style={{ ...styles.rankBadge, backgroundColor: rankColor }}>Rank: {rank}</span>
              <span style={styles.xpNumbers}>{xp.current} / {xp.needed} XP</span>
            </div>
            <div style={styles.xpBarTrack}>
              <div style={{ ...styles.xpBarFill, width: `${xp.percent}%`, backgroundColor: rankColor }} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={styles.contentCard}>
          {/* Skills */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Skills</div>
            <div style={styles.dividerLine} />
            {profile.skills && profile.skills.length > 0 ? (
              <div style={styles.skillsGrid}>
                {profile.skills.map(skill => (
                  <div key={skill} style={styles.skillChip}>
                    <span style={styles.skillEmoji}>{SKILL_EMOJI[skill] ?? '⚔️'}</span>
                    <span style={styles.skillName}>{skill}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyText}>No skills listed.</div>
            )}
          </div>

          {/* Description */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Description</div>
            <div style={styles.dividerLine} />
            {profile.bio ? (
              <p style={styles.bioText}>{profile.bio}</p>
            ) : (
              <p style={styles.emptyText}>This adventurer hasn't written a description yet.</p>
            )}
          </div>

          {/* Account info */}
          <div style={styles.section}>
            <div style={styles.dividerLine} />
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Role:</span>
              <span style={styles.infoValue}>{isGuildmaster ? 'Guildmaster' : 'Adventurer'}</span>
            </div>
            <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Email:</span>
                <span style={styles.infoValue}>{profile.email}</span>
                {isGoogleLinked && <span style={styles.googleG}>G</span>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: "'Prompt', sans-serif" },
  centered: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' },
  notFoundText: { color: '#888', fontSize: '16px' },

  main: { maxWidth: '560px', margin: '0 auto', padding: '24px 24px 32px' },

  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#52734D', fontFamily: "'Prompt', sans-serif", fontWeight: 600,
    fontSize: '13px', padding: '0 0 12px', transition: 'opacity 0.15s',
  },

  viewingBanner: {
    backgroundColor: '#fff8e1', border: '1px solid #ffe082',
    borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
    color: '#795548', fontWeight: 500, marginBottom: '16px',
  },

  profileCard: {
    backgroundColor: '#fff', borderRadius: '16px 16px 0 0', padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #eee', borderBottom: 'none',
  },
  avatarSection: { display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '20px' },
  avatarWrap: { flexShrink: 0 },
  avatarImg: { width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover' as const, border: '3px solid #DDFFBC' },
  avatarPlaceholder: { width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#DDFFBC', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #52734D' },
  nameSection: { flex: 1 },
  username: { fontWeight: 700, fontSize: '22px', color: '#222', marginBottom: '6px' },
  levelRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const },
  levelBadge: { backgroundColor: '#DDFFBC', color: '#52734D', fontSize: '12px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' },
  gmBadge: { backgroundColor: '#52734D', color: '#fff', fontSize: '12px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' },

  rankSection: {},
  rankRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
  rankBadge: { color: '#fff', fontSize: '13px', fontWeight: 700, padding: '3px 12px', borderRadius: '20px', textShadow: '0 1px 3px rgba(0,0,0,0.25)' },
  xpNumbers: { fontSize: '13px', color: '#888', fontWeight: 600 },
  xpBarTrack: { height: '8px', backgroundColor: '#eee', borderRadius: '99px', overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: '99px', transition: 'width 0.4s ease' },

  contentCard: {
    backgroundColor: '#fff', borderRadius: '0 0 16px 16px', padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #eee', borderTop: 'none',
  },
  section: { marginBottom: '20px' },
  sectionTitle: { fontWeight: 700, fontSize: '16px', color: '#222', marginBottom: '8px' },
  dividerLine: { height: '1px', backgroundColor: '#f0f0f0', marginBottom: '14px' },

  skillsGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: '12px' },
  skillChip: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px', minWidth: '60px' },
  skillEmoji: { fontSize: '36px' },
  skillName: { fontSize: '12px', fontWeight: 600, color: '#555', textAlign: 'center' as const },

  bioText: { margin: 0, fontSize: '14px', color: '#444', lineHeight: '1.6', backgroundColor: '#f9fdf5', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e8f5e9' },
  emptyText: { color: '#aaa', fontSize: '14px', fontStyle: 'italic' },

  infoRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', fontSize: '14px', borderBottom: '1px solid #f5f5f5' },
  infoLabel: { color: '#888', fontWeight: 500, minWidth: '120px' },
  infoValue: { color: '#222', fontWeight: 600 },
  googleG: { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#4285F4', flexShrink: 0 } as React.CSSProperties,
};