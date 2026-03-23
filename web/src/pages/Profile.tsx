import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../api/authApi';
 
// ── Rank & XP helpers ─────────────────────────────────────────────────────────
 
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
  const levelStart = (level - 1) * XP_PER_LEVEL;
  const current = Math.max(0, totalXp - levelStart);
  const needed = XP_PER_LEVEL;
  return { current, needed, percent: Math.min(100, (current / needed) * 100) };
}
 
const SKILL_EMOJI: Record<string, string> = {
  Design: '🎨', Academic: '📚', Writing: '✍️', Media: '🎤',
  'Manual Labor': '💪', Tutoring: '🎓', 'IT/Tech': '💻',
};
const ALL_SKILLS = ['Design', 'Academic', 'Writing', 'Media', 'Manual Labor', 'Tutoring', 'IT/Tech'];
 
// ── Component ──────────────────────────────────────────────────────────────────
 
export default function Profile() {
  const navigate = useNavigate();
  const { user, updateUserState } = useAuth();
 
  const isGuildmaster = user?.role === 'ROLE_GUILDMASTER';
  // Where the back button goes
  const backPath = isGuildmaster ? '/admin' : '/guilds';
  const backLabel = isGuildmaster ? '← Admin Dashboard' : '← My Guilds';
 
  const [profileData, setProfileData] = useState<{
    username: string;
    email: string;
    role: string;
    level: number;
    xp: number;
    skills: string[];
    bio: string;
    googleSub?: string;
    profilePictureUrl?: string;
  } | null>(null);
 
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'account'>('about');
 
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState('');
  const [savingBio, setSavingBio] = useState(false);
 
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [savingSkills, setSavingSkills] = useState(false);
 
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
 
  useEffect(() => {
    setIsLoading(true);
    api.get('/auth/me')
      .then(res => {
        const u = res.data?.data?.user ?? res.data?.data ?? res.data;
        setProfileData({
          username: u.username, email: u.email, role: u.role,
          level: u.level ?? 1, xp: u.xp ?? 0, skills: u.skills ?? [],
          bio: u.bio ?? '', googleSub: u.googleSub,
          profilePictureUrl: u.profilePictureUrl,
        });
        setBioValue(u.bio ?? '');
        setSelectedSkills(new Set(u.skills ?? []));
      })
      .catch(() => {
        if (user) {
          setProfileData({
            username: user.username, email: user.email, role: user.role,
            level: user.level ?? 1, xp: user.xp ?? 0, skills: user.skills ?? [],
            bio: user.bio ?? '', googleSub: user.googleSub,
            profilePictureUrl: user.profilePictureUrl,
          });
          setSelectedSkills(new Set(user.skills ?? []));
        }
      })
      .finally(() => setIsLoading(false));
  }, []);
 
  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      await api.put('/profile/me', { bio: bioValue });
      setProfileData(p => p ? { ...p, bio: bioValue } : p);
      // Push to global user state so navbar reflects it
      updateUserState({ bio: bioValue });
      setEditingBio(false);
    } catch {
      // Save locally even if backend not ready
      setProfileData(p => p ? { ...p, bio: bioValue } : p);
      setEditingBio(false);
    } finally {
      setSavingBio(false);
    }
  };
 
  const handleSaveSkills = async () => {
    setSavingSkills(true);
    try {
      const skillsArr = Array.from(selectedSkills);
      await api.post('/auth/skills', { skills: skillsArr });
      setProfileData(p => p ? { ...p, skills: skillsArr } : p);
      updateUserState({ skills: skillsArr });
      setShowSkillsModal(false);
    } catch {
      alert('Failed to save skills.');
    } finally {
      setSavingSkills(false);
    }
  };
 
  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB.'); return; }
 
    setUploadingPicture(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await api.put('/profile/me', { profilePictureUrl: base64 });
      } catch {
        // Store locally even if backend not ready
      } finally {
        setProfileData(p => p ? { ...p, profilePictureUrl: base64 } : p);
        // Push to global state → navbar picture updates immediately
        updateUserState({ profilePictureUrl: base64 });
        setUploadingPicture(false);
      }
    };
    reader.readAsDataURL(file);
  };
 
  if (isLoading || !profileData) {
    return (
      <div style={styles.page}>
        <Navbar />
        <div style={styles.loadingWrap}>Loading profile...</div>
      </div>
    );
  }
 
  const rank = getRank(profileData.level);
  const rankColor = getRankColor(rank);
  const xp = xpProgress(profileData.xp, profileData.level);
  const isGoogleLinked = !!profileData.googleSub;
 
  return (
    <div style={styles.page}>
      <Navbar />
 
      <main style={styles.main}>
 
        {/* Back button */}
        <button style={styles.backBtn} onClick={() => navigate(backPath)}>
          {backLabel}
        </button>
 
        {/* Profile Card */}
        <div style={styles.profileCard}>
          <div style={styles.avatarSection}>
            <div style={styles.avatarWrap}>
              {profileData.profilePictureUrl ? (
                <img src={profileData.profilePictureUrl} alt="avatar" style={styles.avatarImg} />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#52734D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
              )}
              <button style={styles.cameraBtn} onClick={() => fileInputRef.current?.click()} title="Change profile picture" disabled={uploadingPicture}>
                {uploadingPicture ? '⏳' : '📷'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePictureChange} />
            </div>
 
            <div style={styles.nameSection}>
              <div style={styles.username}>{profileData.username}</div>
              <div style={styles.levelRow}>
                <span style={styles.levelBadge}>Level {profileData.level}</span>
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
 
        {/* Tabs */}
        <div style={styles.tabRow}>
          <button style={{ ...styles.tab, ...(activeTab === 'about' ? styles.tabActive : {}) }} onClick={() => setActiveTab('about')}>
            About the Adventurer
          </button>
          <button style={{ ...styles.tab, ...(activeTab === 'account' ? styles.tabActive : {}) }} onClick={() => setActiveTab('account')}>
            Account
          </button>
        </div>
 
        {/* About Tab */}
        {activeTab === 'about' && (
          <div style={styles.contentCard}>
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Skills</span>
                <button style={styles.editBtn} onClick={() => { setSelectedSkills(new Set(profileData.skills)); setShowSkillsModal(true); }}>
                  Edit Skills
                </button>
              </div>
              <div style={styles.dividerLine} />
              {profileData.skills.length === 0 ? (
                <div style={styles.emptySkills}>No skills selected yet.</div>
              ) : (
                <div style={styles.skillsGrid}>
                  {profileData.skills.map(skill => (
                    <div key={skill} style={styles.skillChip}>
                      <span style={styles.skillEmoji}>{SKILL_EMOJI[skill] ?? '⚔️'}</span>
                      <span style={styles.skillName}>{skill}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
 
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Description</span>
                {!editingBio && (
                  <button style={styles.editBtn} onClick={() => { setBioValue(profileData.bio); setEditingBio(true); }}>Edit</button>
                )}
              </div>
              <div style={styles.dividerLine} />
              {editingBio ? (
                <div>
                  <textarea style={styles.bioTextarea} value={bioValue} onChange={e => setBioValue(e.target.value)}
                    placeholder="Tell the guild about yourself..." rows={4} maxLength={500} autoFocus />
                  <div style={styles.bioActions}>
                    <span style={styles.charCount}>{bioValue.length}/500</span>
                    <button style={styles.cancelTextBtn} onClick={() => setEditingBio(false)}>Cancel</button>
                    <button style={{ ...styles.saveTextBtn, opacity: savingBio ? 0.7 : 1 }} onClick={handleSaveBio} disabled={savingBio}>
                      {savingBio ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.bioDisplay}>
                  {profileData.bio
                    ? <p style={styles.bioText}>{profileData.bio}</p>
                    : <p style={styles.bioPlaceholder}>No description yet. Tell the guild about yourself!</p>
                  }
                </div>
              )}
            </div>
 
            <div style={styles.section}>
              <div style={styles.dividerLine} />
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Role:</span>
                <span style={styles.infoValue}>{isGuildmaster ? 'Guildmaster' : 'Adventurer'}</span>
              </div>
            </div>
          </div>
        )}
 
        {/* Account Tab */}
        {activeTab === 'account' && (
          <div style={styles.contentCard}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Email:</span>
              <span style={styles.infoValue}>{profileData.email}</span>
              {isGoogleLinked && <span style={styles.googleG}>G</span>}
            </div>
            <div style={styles.dividerLine} />
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Role:</span>
              <span style={styles.infoValue}>{isGuildmaster ? 'Guildmaster' : 'Adventurer'}</span>
            </div>
          </div>
        )}
      </main>
 
      {/* Edit Skills Modal */}
      {showSkillsModal && (
        <div style={styles.overlay} onClick={() => setShowSkillsModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit Skills</h2>
              <button style={styles.closeBtn} onClick={() => setShowSkillsModal(false)}>✕</button>
            </div>
            <p style={styles.modalSubtitle}>Select all skills you feel confident in:</p>
            <div style={styles.skillsGrid2}>
              {ALL_SKILLS.map(skill => {
                const isSelected = selectedSkills.has(skill);
                return (
                  <button key={skill}
                    style={{ ...styles.skillSelectBtn, ...(isSelected ? styles.skillSelectBtnActive : {}) }}
                    onClick={() => { const next = new Set(selectedSkills); next.has(skill) ? next.delete(skill) : next.add(skill); setSelectedSkills(next); }}>
                    <span style={{ fontSize: '28px' }}>{SKILL_EMOJI[skill]}</span>
                    <span style={styles.skillSelectName}>{skill}</span>
                  </button>
                );
              })}
            </div>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowSkillsModal(false)}>Cancel</button>
              <button style={{ ...styles.submitBtn, opacity: savingSkills ? 0.7 : 1 }} onClick={handleSaveSkills} disabled={savingSkills}>
                {savingSkills ? 'Saving...' : 'Save Skills'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 
const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: "'Prompt', sans-serif" },
  loadingWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#888', fontSize: '15px' },
  main: { maxWidth: '560px', margin: '0 auto', padding: '24px 24px 32px' },
 
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#52734D', fontFamily: "'Prompt', sans-serif", fontWeight: 600,
    fontSize: '13px', padding: '0 0 16px', transition: 'opacity 0.15s',
  },

  profileCard: { backgroundColor: '#fff', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '0', border: '1px solid #eee', borderBottom: 'none', borderRadius: '16px 16px 0 0' } as React.CSSProperties,
  avatarSection: { display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '20px' },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatarImg: { width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover' as const, border: '3px solid #DDFFBC' },
  avatarPlaceholder: { width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#DDFFBC', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #52734D' },
  cameraBtn: { position: 'absolute', bottom: '-2px', right: '-2px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#52734D', border: '2px solid #fff', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
  nameSection: { flex: 1 },
  username: { fontWeight: 700, fontSize: '22px', color: '#222', marginBottom: '4px' },
  levelRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  levelBadge: { backgroundColor: '#DDFFBC', color: '#52734D', fontSize: '12px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' },
  rankSection: {},
  rankRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
  rankBadge: { color: '#fff', fontSize: '13px', fontWeight: 700, padding: '3px 12px', borderRadius: '20px', textShadow: '0 1px 3px rgba(0,0,0,0.25)' },
  xpNumbers: { fontSize: '13px', color: '#888', fontWeight: 600 },
  xpBarTrack: { height: '8px', backgroundColor: '#eee', borderRadius: '99px', overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: '99px', transition: 'width 0.4s ease' },

  tabRow: { display: 'flex', borderBottom: '2px solid #eee', backgroundColor: '#fff', borderLeft: '1px solid #eee', borderRight: '1px solid #eee' },
  tab: { background: 'none', border: 'none', padding: '10px 20px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '14px', color: '#888', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: '-2px', transition: 'color 0.15s' },
  tabActive: { color: '#34C759', borderBottom: '2px solid #34C759' },

  contentCard: { backgroundColor: '#fff', borderRadius: '0 0 16px 16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #eee', borderTop: 'none' },
  section: { marginBottom: '20px' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
  sectionTitle: { fontWeight: 700, fontSize: '16px', color: '#222' },
  editBtn: { background: 'none', border: '1.5px solid #34C759', borderRadius: '20px', padding: '3px 14px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '12px', color: '#34C759', cursor: 'pointer' },
  dividerLine: { height: '1px', backgroundColor: '#f0f0f0', marginBottom: '14px' },
  emptySkills: { color: '#aaa', fontSize: '14px', fontStyle: 'italic' },
  skillsGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: '12px' },
  skillChip: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px', minWidth: '60px' },
  skillEmoji: { fontSize: '36px' },
  skillName: { fontSize: '12px', fontWeight: 600, color: '#555', textAlign: 'center' as const },
  bioTextarea: { width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', fontFamily: "'Prompt', sans-serif", outline: 'none', boxSizing: 'border-box' as const, resize: 'vertical' as const, lineHeight: '1.5' },
  bioActions: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' },
  charCount: { fontSize: '12px', color: '#aaa', marginRight: 'auto' },
  cancelTextBtn: { background: 'none', border: 'none', color: '#888', fontSize: '13px', cursor: 'pointer', fontFamily: "'Prompt', sans-serif", padding: '4px 8px' },
  saveTextBtn: { backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '20px', padding: '6px 16px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '13px', cursor: 'pointer' },
  bioDisplay: {},
  bioText: { margin: 0, fontSize: '14px', color: '#444', lineHeight: '1.6', backgroundColor: '#f9fdf5', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e8f5e9' },
  bioPlaceholder: { margin: 0, fontSize: '14px', color: '#bbb', fontStyle: 'italic' },
  infoRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', fontSize: '14px', borderBottom: '1px solid #f5f5f5' },
  infoLabel: { color: '#888', fontWeight: 500, minWidth: '120px' },
  infoValue: { color: '#222', fontWeight: 600 },
  googleG: { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#4285F4', flexShrink: 0 } as React.CSSProperties,

  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '24px' },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
  modalTitle: { color: '#34C759', fontWeight: 700, fontSize: '20px', margin: 0 },
  modalSubtitle: { color: '#666', fontSize: '13px', margin: '0 0 20px' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#888', padding: '4px', borderRadius: '6px' },
  skillsGrid2: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' },
  skillSelectBtn: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px', padding: '14px 8px', backgroundColor: '#fff', border: '2px solid #e0e0e0', borderRadius: '12px', cursor: 'pointer', fontFamily: "'Prompt', sans-serif", transition: 'all 0.15s' },
  skillSelectBtnActive: { border: '2px solid #34C759', backgroundColor: '#f0fff4' },
  skillSelectName: { fontSize: '12px', fontWeight: 600, color: '#333' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
  cancelBtn: { background: 'none', border: '1.5px solid #ddd', borderRadius: '20px', padding: '8px 20px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '14px', color: '#666', cursor: 'pointer' },
  submitBtn: { backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 24px', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
};