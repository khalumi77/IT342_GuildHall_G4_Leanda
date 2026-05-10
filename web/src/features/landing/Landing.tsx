// src/pages/Landing.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 80);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={styles.root}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes floatScroll {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50%       { transform: translateY(-10px) rotate(-3deg); }
        }
        @keyframes shimmerGold {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes particleDrift {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0.7; }
          50%  { transform: translateY(-40px) translateX(15px) scale(1.2); opacity: 1; }
          100% { transform: translateY(-80px) translateX(-10px) scale(0.8); opacity: 0; }
        }
        @keyframes drawLine {
          from { width: 0; }
          to   { width: 60px; }
        }
        @keyframes revealLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes revealRight {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(52,199,89,0.3); }
          50%       { box-shadow: 0 0 40px rgba(52,199,89,0.6), 0 0 60px rgba(52,199,89,0.2); }
        }

        .hero-loaded .hero-badge  { animation: fadeUp 0.6s ease 0.1s both; }
        .hero-loaded .hero-title  { animation: fadeUp 0.7s ease 0.25s both; }
        .hero-loaded .hero-tagline{ animation: fadeUp 0.6s ease 0.45s both; }
        .hero-loaded .hero-cta    { animation: fadeUp 0.6s ease 0.6s both; }
        .hero-loaded .hero-note   { animation: fadeUp 0.5s ease 0.75s both; }
        .hero-loaded .hero-scroll { animation: fadeIn 0.8s ease 1s both; }

        .feat-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .feat-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 50px rgba(82,115,77,0.15) !important;
        }

        .cta-btn-primary {
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
          animation: pulseGlow 3s ease-in-out infinite;
        }
        .cta-btn-primary:hover {
          transform: translateY(-3px) scale(1.03);
          filter: brightness(1.08);
        }
        .cta-btn-secondary {
          transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
        }
        .cta-btn-secondary:hover {
          transform: translateY(-2px);
          background: rgba(221,255,188,0.25) !important;
          color: #DDFFBC !important;
        }

        .nav-link {
          transition: color 0.2s ease, opacity 0.2s ease;
        }
        .nav-link:hover { color: #DDFFBC !important; opacity: 1 !important; }

        .particle {
          position: absolute;
          width: 4px; height: 4px;
          border-radius: 50%;
          background: #DDFFBC;
          animation: particleDrift linear infinite;
          pointer-events: none;
        }

        .scroll-indicator {
          animation: floatScroll 3s ease-in-out infinite;
        }

        .divider-line {
          animation: drawLine 0.8s ease forwards;
        }

        .stat-num {
          background: linear-gradient(135deg, #52734D, #34C759, #52734D);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerGold 3s linear infinite;
        }

        .section-reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .section-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* ── Floating particles ── */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className="particle" style={{
          left: `${8 + i * 8}%`,
          top: `${20 + (i % 4) * 15}%`,
          animationDuration: `${4 + (i % 5)}s`,
          animationDelay: `${i * 0.4}s`,
          opacity: 0.3 + (i % 3) * 0.2,
          width: i % 3 === 0 ? '6px' : '3px',
          height: i % 3 === 0 ? '6px' : '3px',
        }} />
      ))}

      {/* ── Navbar ── */}
      <nav style={{
        ...styles.nav,
        backgroundColor: scrollY > 40 ? 'rgba(15,25,12,0.92)' : 'transparent',
        backdropFilter: scrollY > 40 ? 'blur(16px)' : 'none',
        borderBottom: scrollY > 40 ? '1px solid rgba(221,255,188,0.12)' : '1px solid transparent',
        transition: 'background-color 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease',
      }}>
        {/* Logo */}
        <div style={styles.navLogo}>
          <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="1" width="11" height="16" rx="1.5" fill="#DDFFBC"/>
            <polygon points="2,17 7.5,13.5 13,17 13,17 13,1 2,1" fill="#DDFFBC"/>
            <rect x="4" y="4" width="5" height="1.5" rx="0.75" fill="#52734D"/>
            <rect x="4" y="7" width="7" height="1.5" rx="0.75" fill="#52734D"/>
            <rect x="4" y="10" width="6" height="1.5" rx="0.75" fill="#52734D"/>
            <rect x="14" y="0" width="6" height="10" rx="1" fill="#DDFFBC"/>
            <polygon points="14,10 17,8 20,10" fill="#52734D"/>
          </svg>
          <span style={styles.navLogoText}>GuildHall</span>
        </div>

        {/* Nav links */}
        <div style={styles.navLinks}>
          <button className="nav-link" style={styles.navLink} onClick={() => navigate('/login')}>
            Sign In
          </button>
          <button style={styles.navSignUp} onClick={() => navigate('/register')}>
            Sign Up
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section style={styles.hero} className={loaded ? 'hero-loaded' : ''}>
        {/* Mountain / forest SVG background */}
        <div style={styles.heroBg}>
          {/* Sky gradient layer */}
          <div style={styles.skyLayer} />

          {/* Far mountains */}
          <svg style={{ ...styles.mountainLayer, opacity: 0.35 }} viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax meet">
            <polygon points="0,400 200,180 350,280 520,120 700,260 870,100 1040,230 1200,140 1440,260 1440,400" fill="#1a3a1a"/>
          </svg>

          {/* Mid mountains */}
          <svg style={{ ...styles.mountainLayer, opacity: 0.55 }} viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax meet">
            <polygon points="0,400 150,240 280,310 440,170 610,290 780,150 940,270 1100,180 1280,300 1440,200 1440,400" fill="#152e15"/>
          </svg>

          {/* Near treeline */}
          <svg style={{ ...styles.mountainLayer, opacity: 0.8 }} viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax meet">
            {/* Trees as triangles */}
            {[0,60,110,160,200,250,300,360,420,470,520,570,640,700,760,820,880,940,1000,1060,1120,1180,1240,1300,1360,1410].map((x, i) => (
              <polygon key={i}
                points={`${x},400 ${x + 30},${290 - (i % 4) * 18} ${x + 60},400`}
                fill={i % 3 === 0 ? '#0d1f0d' : i % 3 === 1 ? '#112511' : '#0a1a0a'}
              />
            ))}
          </svg>

          {/* Fog / mist */}
          <div style={styles.mistLayer} />

          {/* Dark overlay for readability */}
          <div style={styles.heroOverlay} />
        </div>

        {/* Hero content */}
        <div style={styles.heroContent}>
          <div className="hero-badge" style={styles.heroBadge}>
            <span style={styles.heroBadgeDot} />
            Real-world quests. Real rewards.
          </div>

          <h1 className="hero-title" style={styles.heroTitle}>
            <span style={styles.heroTitleLine1}>Your Adventure</span>
            <span style={styles.heroTitleLine2}>Begins Here</span>
          </h1>

          <p className="hero-tagline" style={styles.heroTagline}>
            "Real world help. Legendary rewards."
          </p>

          <div className="hero-cta" style={styles.heroCTARow}>
            <button className="cta-btn-primary" style={styles.ctaPrimary} onClick={() => navigate('/register')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              Get Started
            </button>
            <button className="cta-btn-secondary" style={styles.ctaSecondary} onClick={() => navigate('/login')}>
              Sign In Instead
            </button>
          </div>

          <p className="hero-note" style={styles.heroNote}>
            No experience required. Join your first guild for free.
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="hero-scroll scroll-indicator" style={styles.scrollIndicator}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(221,255,188,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </section>

      {/* ── Stats Banner ── */}
      <RevealSection>
        <div style={styles.statsBanner}>
          {[
            { num: '500+', label: 'Active Adventurers' },
            { num: '120+', label: 'Quests Completed' },
            { num: '30+', label: 'Guilds Formed' },
            { num: '₱0', label: 'Free to Join' },
          ].map((stat, i) => (
            <div key={i} style={styles.statItem}>
              <div className="stat-num" style={styles.statNum}>{stat.num}</div>
              <div style={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </RevealSection>

      {/* ── Features Section ── */}
      <RevealSection delay={100}>
        <section style={styles.featuresSection}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionEyebrow}>How It Works</div>
            <h2 style={styles.sectionTitle}>Your Path to Glory</h2>
            <div style={styles.sectionDivider}>
              <div className="divider-line" style={styles.dividerLine} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#34C759"><polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9"/></svg>
              <div className="divider-line" style={styles.dividerLine} />
            </div>
          </div>

          <div style={styles.featuresGrid}>
            {FEATURES.map((feat, i) => (
              <FeatureCard key={i} {...feat} index={i} />
            ))}
          </div>
        </section>
      </RevealSection>

      {/* ── How It Works Steps ── */}
      <RevealSection delay={150}>
        <section style={styles.stepsSection}>
          <div style={styles.stepsInner}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionEyebrow}>The Journey</div>
              <h2 style={{ ...styles.sectionTitle, color: '#52734D' }}>Three Steps to Adventure</h2>
            </div>
            <div style={styles.stepsGrid}>
              {STEPS.map((step, i) => (
                <div key={i} style={styles.stepItem}>
                  <div style={styles.stepNumber}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={styles.stepIcon}>{step.icon}</div>
                  <h3 style={styles.stepTitle}>{step.title}</h3>
                  <p style={styles.stepDesc}>{step.desc}</p>
                  {i < STEPS.length - 1 && (
                    <div style={styles.stepArrow}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(82,115,77,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── Quest Types Section ── */}
      <RevealSection delay={100}>
        <section style={styles.questTypesSection}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionEyebrow}>Quest Board</div>
            <h2 style={styles.sectionTitle}>Choose Your Quest Type</h2>
            <div style={styles.sectionDivider}>
              <div className="divider-line" style={styles.dividerLine} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#34C759"><polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9"/></svg>
              <div className="divider-line" style={styles.dividerLine} />
            </div>
          </div>

          <div style={styles.questTypesGrid}>
            <div style={{ ...styles.questTypeCard, borderColor: '#34C759' }}>
              <div style={{ ...styles.questTypeIcon, backgroundColor: '#DDFFBC', color: '#34C759' }}>⚔️</div>
              <h3 style={styles.questTypeTitle}>Volunteer</h3>
              <p style={styles.questTypeDesc}>Help fellow adventurers out of goodwill. Build reputation, gain XP, and level up your rank.</p>
              <div style={{ ...styles.questTypeBadge, backgroundColor: '#DDFFBC', color: '#34C759', border: '1px solid #34C759' }}>+20 XP per quest</div>
            </div>
            <div style={{ ...styles.questTypeCard, borderColor: '#52734D', background: '#DDFFBC' }}>
              <div style={styles.questTypeFeaturedTag}>Most Rewarding</div>
              <div style={{ ...styles.questTypeIcon, backgroundColor: 'rgba(82,115,77,0.15)', color: '#52734D' }}>💰</div>
              <h3 style={{ ...styles.questTypeTitle, color: '#52734D' }}>Paid</h3>
              <p style={{ ...styles.questTypeDesc, color: '#3a5a35' }}>Commission quests with real monetary rewards. Set your price, hire the best adventurer for the job.</p>
              <div style={{ ...styles.questTypeBadge, backgroundColor: '#52734D', color: '#DDFFBC' }}>Custom reward + XP</div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── Final CTA ── */}
      <RevealSection delay={100}>
        <section style={styles.finalCTA}>
          {/* Decorative scroll SVG */}
          <div style={styles.finalScrollDecor}>
            <svg viewBox="0 0 120 140" fill="none" style={{ width: '100px', opacity: 0.12 }}>
              <rect x="10" y="10" width="80" height="110" rx="8" fill="#DDFFBC"/>
              <rect x="20" y="30" width="40" height="6" rx="3" fill="#52734D"/>
              <rect x="20" y="44" width="60" height="4" rx="2" fill="#52734D"/>
              <rect x="20" y="55" width="55" height="4" rx="2" fill="#52734D"/>
              <rect x="20" y="66" width="50" height="4" rx="2" fill="#52734D"/>
              <rect x="20" y="77" width="45" height="4" rx="2" fill="#52734D"/>
              <ellipse cx="60" cy="10" rx="20" ry="8" fill="#DDFFBC"/>
              <ellipse cx="60" cy="120" rx="20" ry="8" fill="#DDFFBC"/>
            </svg>
          </div>

          <div style={styles.finalCTABadge}>⚔️ Begin Your Journey</div>
          <h2 style={styles.finalCTATitle}>Ready to Join the Guild?</h2>
          <p style={styles.finalCTASubtitle}>
            Thousands of adventurers are already helping each other.<br/>
            Your first quest awaits.
          </p>
          <button
            className="cta-btn-primary"
            style={{ ...styles.ctaPrimary, fontSize: '17px', padding: '16px 48px' }}
            onClick={() => navigate('/register')}
          >
            Create Your Account
          </button>
          <p style={{ ...styles.heroNote, marginTop: '16px', color: '#52734D' }}>
            Already a member?{' '}
            <span
              style={{ color: '#34C759', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
              onClick={() => navigate('/login')}
            >
              Sign in here
            </span>
          </p>
        </section>
      </RevealSection>

      {/* ── Footer ── */}
      <footer style={styles.footer}>
        <div style={styles.footerLogo}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="1" width="11" height="16" rx="1.5" fill="#DDFFBC"/>
            <polygon points="2,17 7.5,13.5 13,17 13,17 13,1 2,1" fill="#DDFFBC"/>
            <rect x="4" y="4" width="5" height="1.5" rx="0.75" fill="#52734D"/>
            <rect x="4" y="7" width="7" height="1.5" rx="0.75" fill="#52734D"/>
            <rect x="14" y="0" width="6" height="10" rx="1" fill="#DDFFBC"/>
            <polygon points="14,10 17,8 20,10" fill="#52734D"/>
          </svg>
          <span style={styles.footerLogoText}>GuildHall</span>
        </div>
        <p style={styles.footerTagline}>"Real world help. Legendary rewards."</p>
        <p style={styles.footerCopy}>© {new Date().getFullYear()} GuildHall. All rights reserved.</p>
      </footer>
    </div>
  );
}

// ── Reveal on scroll helper ────────────────────────────────────────────────────

function RevealSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={`section-reveal ${visible ? 'visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ── Feature Card ──────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, desc, index }: { icon: string; title: string; desc: string; index: number }) {
  return (
    <div className="feat-card" style={{
      ...styles.featCard,
      animationDelay: `${index * 0.1}s`,
    }}>
      <div style={styles.featIconWrap}>
        <span style={styles.featIcon}>{icon}</span>
      </div>
      <h3 style={styles.featTitle}>{title}</h3>
      <p style={styles.featDesc}>{desc}</p>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '📋',
    title: 'Browse Real Quests',
    desc: 'Discover tasks posted by community members that match your skills — design, tutoring, tech help, and more.',
  },
  {
    icon: '🏰',
    title: 'Join a Guild',
    desc: 'Work with people you actually know in dedicated sub-groups. Build trust, reputation, and lasting connections.',
  },
  {
    icon: '⭐',
    title: 'Earn Rewards',
    desc: 'Volunteer out of good will or get paid for your expertise. Every quest completed earns XP and raises your rank.',
  },
  {
    icon: '🗡️',
    title: 'Level Up Your Rank',
    desc: 'Progress from Bronze to Adamantite as you complete quests. Your rank is a badge of honor in the community.',
  },
];

const STEPS = [
  {
    icon: '📜',
    title: 'Create Your Profile',
    desc: 'Sign up, pick your skills, and join the Global Square guild automatically.',
  },
  {
    icon: '🏰',
    title: 'Find Your Guild',
    desc: 'Browse community guilds or get invited. Each guild has its own quest board.',
  },
  {
    icon: '⚔️',
    title: 'Accept a Quest',
    desc: 'Pick a quest that fits your skills, complete it, and collect your reward.',
  },
];

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: "'Prompt', sans-serif",
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
    overflowX: 'hidden',
    minHeight: '100vh',
  },

  // NAV
  nav: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    height: '64px',
  },
  navLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'default',
  },
  navLogoText: {
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 700,
    fontSize: '20px',
    color: '#DDFFBC',
    letterSpacing: '0.5px',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  navLink: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(221,255,188,0.7)',
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 500,
    fontSize: '15px',
    padding: '6px 12px',
  },
  navSignUp: {
    background: 'rgba(52,199,89,0.15)',
    border: '1.5px solid rgba(52,199,89,0.5)',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#34C759',
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 600,
    fontSize: '14px',
    padding: '7px 18px',
    transition: 'background 0.2s ease, border-color 0.2s ease',
  },

  // HERO
  hero: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingTop: '64px',
  },
  heroBg: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
  },
  skyLayer: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, #0d2410 0%, #1a3d1a 30%, #0f2810 60%, #071007 100%)',
  },
  mountainLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '60%',
  },
  mistLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    background: 'linear-gradient(to top, rgba(10,21,10,0.9) 0%, rgba(10,21,10,0.3) 60%, transparent 100%)',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at center 40%, rgba(52,199,89,0.05) 0%, transparent 70%)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '0 24px',
    maxWidth: '760px',
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(52,199,89,0.12)',
    border: '1px solid rgba(52,199,89,0.35)',
    borderRadius: '100px',
    padding: '6px 18px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#34C759',
    letterSpacing: '0.5px',
    marginBottom: '28px',
  },
  heroBadgeDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#34C759',
    boxShadow: '0 0 8px rgba(52,199,89,0.8)',
    display: 'inline-block',
  },
  heroTitle: {
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 900,
    lineHeight: 1.1,
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  heroTitleLine1: {
    fontSize: 'clamp(42px, 8vw, 80px)',
    color: '#DDFFBC',
    display: 'block',
    textShadow: '0 0 60px rgba(221,255,188,0.3)',
  },
  heroTitleLine2: {
    fontSize: 'clamp(42px, 8vw, 80px)',
    background: 'linear-gradient(135deg, #34C759, #DDFFBC)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    display: 'block',
  },
  heroTagline: {
    fontFamily: "'Prompt', sans-serif",
    fontStyle: 'italic',
    fontSize: 'clamp(18px, 3vw, 24px)',
    color: 'rgba(221,255,188,0.65)',
    marginBottom: '36px',
    letterSpacing: '0.3px',
  },
  heroCTARow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  ctaPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#34C759',
    color: '#071007',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 36px',
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 700,
    fontSize: '15px',
    letterSpacing: '0.5px',
    cursor: 'pointer',
  },
  ctaSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'transparent',
    color: 'rgba(221,255,188,0.75)',
    border: '1.5px solid rgba(221,255,188,0.25)',
    borderRadius: '12px',
    padding: '14px 28px',
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 500,
    fontSize: '14px',
    cursor: 'pointer',
  },
  heroNote: {
    fontSize: '13px',
    color: 'rgba(221,255,188,0.5)',
    letterSpacing: '0.2px',
  },
  scrollIndicator: {
    position: 'absolute',
    bottom: '32px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    zIndex: 2,
    cursor: 'default',
  },

  // STATS
  statsBanner: {
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: '0',
    backgroundColor: '#ffffff',
    borderTop: '3px solid #34C759',
    borderBottom: '1px solid #DDFFBC',
    padding: '48px 24px',
    flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 56px',
    borderRight: '1px solid #DDFFBC',
  },
  statNum: {
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 700,
    fontSize: '42px',
    lineHeight: 1,
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '11px',
    color: '#52734D',
    fontWeight: 600,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
  },

  // FEATURES
  featuresSection: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '100px 32px',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '60px',
  },
  sectionEyebrow: {
    fontFamily: "'Prompt', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    color: '#34C759',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    marginBottom: '14px',
  },
  sectionTitle: {
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 700,
    fontSize: 'clamp(28px, 4vw, 42px)',
    color: '#52734D',
    lineHeight: 1.2,
    marginBottom: '20px',
  },
  sectionDivider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
  },
  dividerLine: {
    height: '1.5px',
    backgroundColor: '#DDFFBC',
    display: 'inline-block',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
  },
  featCard: {
    backgroundColor: '#ffffff',
    border: '1.5px solid #DDFFBC',
    borderRadius: '16px',
    padding: '32px 28px',
    boxShadow: '0 4px 20px rgba(82,115,77,0.08)',
    cursor: 'default',
  },
  featIconWrap: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    backgroundColor: '#DDFFBC',
    border: '1.5px solid #34C759',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  featIcon: {
    fontSize: '26px',
  },
  featTitle: {
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 600,
    fontSize: '17px',
    color: '#52734D',
    marginBottom: '10px',
    lineHeight: 1.3,
  },
  featDesc: {
    fontSize: '14px',
    color: '#555555',
    lineHeight: '1.65',
  },

  // STEPS
  stepsSection: {
    background: '#DDFFBC',
    borderTop: '1px solid rgba(82,115,77,0.15)',
    borderBottom: '1px solid rgba(82,115,77,0.15)',
    padding: '100px 32px',
  },
  stepsInner: {
    maxWidth: '1100px',
    margin: '0 auto',
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '40px',
    position: 'relative',
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    position: 'relative',
  },
  stepNumber: {
    fontFamily: "'Prompt', sans-serif",
    fontSize: '11px',
    fontWeight: 600,
    color: '#34C759',
    letterSpacing: '2px',
    marginBottom: '12px',
  },
  stepIcon: {
    fontSize: '44px',
    marginBottom: '16px',
    filter: 'drop-shadow(0 2px 8px rgba(82,115,77,0.25))',
  },
  stepTitle: {
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 600,
    fontSize: '18px',
    color: '#52734D',
    marginBottom: '10px',
  },
  stepDesc: {
    fontSize: '14px',
    color: '#3a5a35',
    lineHeight: '1.65',
    maxWidth: '260px',
  },
  stepArrow: {
    position: 'absolute',
    right: '-32px',
    top: '60px',
    zIndex: 1,
  },

  // QUEST TYPES
  questTypesSection: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '100px 32px',
    backgroundColor: '#ffffff',
  },
  questTypesGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  questTypeCard: {
    position: 'relative',
    backgroundColor: '#ffffff',
    border: '1.5px solid',
    borderRadius: '20px',
    padding: '36px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '14px',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
    cursor: 'default',
    boxShadow: '0 4px 20px rgba(82,115,77,0.08)',
  },
  questTypeFeaturedTag: {
    position: 'absolute',
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#34C759',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 700,
    padding: '3px 14px',
    borderRadius: '100px',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
  },
  questTypeIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
  },
  questTypeTitle: {
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 700,
    fontSize: '22px',
    color: '#52734D',
  },
  questTypeDesc: {
    fontSize: '14px',
    color: '#555555',
    lineHeight: '1.65',
  },
  questTypeBadge: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '5px 14px',
    borderRadius: '100px',
    letterSpacing: '0.3px',
    marginTop: '4px',
  },

  // FINAL CTA
  finalCTA: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '120px 32px',
    background: '#DDFFBC',
    borderTop: '1px solid rgba(82,115,77,0.15)',
    overflow: 'hidden',
  },
  finalScrollDecor: {
    position: 'absolute',
    top: '40px',
    right: '10%',
    pointerEvents: 'none',
  },
  finalCTABadge: {
    fontFamily: "'Prompt', sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    color: '#34C759',
    letterSpacing: '2px',
    marginBottom: '20px',
  },
  finalCTATitle: {
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 900,
    fontSize: 'clamp(32px, 5vw, 56px)',
    color: '#52734D',
    lineHeight: 1.15,
    marginBottom: '20px',
  },
  finalCTASubtitle: {
    fontSize: '16px',
    color: '#3a5a35',
    lineHeight: '1.7',
    marginBottom: '40px',
    maxWidth: '480px',
  },

  // FOOTER
  footer: {
    borderTop: '1px solid #DDFFBC',
    padding: '40px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#52734D',
  },
  footerLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  footerLogoText: {
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 700,
    fontSize: '16px',
    color: '#DDFFBC',
  },
  footerTagline: {
    fontFamily: "'Prompt', sans-serif",
    fontStyle: 'italic',
    fontSize: '14px',
    color: 'rgba(221,255,188,0.7)',
  },
  footerCopy: {
    fontSize: '12px',
    color: 'rgba(221,255,188,0.4)',
    letterSpacing: '0.3px',
  },
};