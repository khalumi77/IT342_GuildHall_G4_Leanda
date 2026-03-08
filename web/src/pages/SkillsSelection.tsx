// src/pages/SkillsSelection.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SKILLS = [
  { name: 'Design',       emoji: '🎨' },
  { name: 'Academic',     emoji: '📚' },
  { name: 'Manual Labor', emoji: '💪' },
  { name: 'IT/Tech',      emoji: '💻' },
  { name: 'Media',        emoji: '🎤' },
  { name: 'Writing',      emoji: '✍️' },
  { name: 'Tutoring',     emoji: '🎓' },
];

export default function SkillsSelection() {
  const navigate = useNavigate();
  const { saveSkills } = useAuth();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = (skill: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(skill) ? next.delete(skill) : next.add(skill);
      return next;
    });
  };

  const handleContinue = async () => {
    setIsLoading(true);
    setError('');
    try {
      await saveSkills(Array.from(selected));
      navigate('/dashboard');
    } catch {
      setError('Failed to save your skills. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div style={styles.page}>
      {/* Left panel */}
      <div style={styles.leftPanel}>
        <div style={styles.logo}>
          <span>📜</span>
          <span style={styles.logoText}>GuildHall</span>
        </div>
        <div style={styles.mascot}>📜</div>
        <div style={styles.features}>
          {FEATURES.map((f, i) => (
            <div key={i} style={styles.featureCard}>
              <span style={styles.featureIcon}>{f.icon}</span>
              <p style={styles.featureText}>{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={styles.rightPanel}>
        <div style={styles.content}>
          <h1 style={styles.title}>What are your skills,<br />adventurer?</h1>
          <p style={styles.subtitle}>
            Select as many skills you feel confident in (You can change these later):
          </p>

          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={styles.grid}>
            {SKILLS.map(skill => {
              const isSelected = selected.has(skill.name);
              return (
                <button
                  key={skill.name}
                  onClick={() => toggle(skill.name)}
                  style={{
                    ...styles.skillBtn,
                    ...(isSelected ? styles.skillBtnSelected : {}),
                  }}
                >
                  <span style={styles.skillEmoji}>{skill.emoji}</span>
                  <span style={styles.skillName}>{skill.name}</span>
                </button>
              );
            })}
          </div>

          <div style={styles.actions}>
            <button
              onClick={handleSkip}
              style={styles.skipBtn}
              disabled={isLoading}
            >
              Skip for now
            </button>
            <button
              onClick={handleContinue}
              style={{ ...styles.continueBtn, opacity: isLoading ? 0.7 : 1 }}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: '📋', text: 'Browse real-time community tasks. Find a mission that matches your skills.' },
  { icon: '🏠', text: 'Work together with people you actually know in dedicated sub-groups.' },
  { icon: '⭐', text: 'Volunteer out of good will or be rewarded for your hard work via Stripe, all heroes are welcome!' },
];

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Prompt', sans-serif",
    backgroundColor: '#f5f5f5',
  },
  leftPanel: {
    width: '340px',
    minWidth: '340px',
    backgroundColor: '#52734D',
    padding: '32px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '22px',
  },
  logoText: {
    color: '#fff',
    fontWeight: 700,
    fontSize: '20px',
  },
  mascot: {
    fontSize: '80px',
    textAlign: 'center',
    marginTop: '8px',
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  featureCard: {
    backgroundColor: 'rgba(221,255,188,0.35)',
    borderRadius: '12px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  featureIcon: { fontSize: '18px', flexShrink: 0, marginTop: '2px' },
  featureText: { color: '#fff', fontSize: '13px', lineHeight: '1.5', margin: 0 },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
  },
  content: {
    width: '100%',
    maxWidth: '480px',
  },
  title: {
    color: '#34C759',
    fontWeight: 700,
    fontSize: '32px',
    lineHeight: '1.25',
    margin: '0 0 12px',
  },
  subtitle: {
    color: '#555',
    fontSize: '14px',
    margin: '0 0 28px',
  },
  errorBox: {
    backgroundColor: '#ffe5e5',
    color: '#c73434',
    border: '1px solid #f5c6c6',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '32px',
  },
  skillBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '18px 12px',
    backgroundColor: '#fff',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: "'Prompt', sans-serif",
  },
  skillBtnSelected: {
    border: '2px solid #34C759',
    backgroundColor: '#f0fff4',
  },
  skillEmoji: {
    fontSize: '32px',
  },
  skillName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '16px',
  },
  skipBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: "'Prompt', sans-serif",
    padding: '8px 12px',
  },
  continueBtn: {
    backgroundColor: '#34C759',
    color: '#fff',
    border: 'none',
    borderRadius: '50px',
    padding: '12px 32px',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    fontFamily: "'Prompt', sans-serif",
  },
};