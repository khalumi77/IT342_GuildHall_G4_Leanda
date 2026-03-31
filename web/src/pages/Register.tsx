// src/pages/Register.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Register() {
  const navigate = useNavigate();
  const { register, setTransitioning } = useAuth();

  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.username) e.username = 'Username is required';
    else if (form.username.length < 3) e.username = 'Must be at least 3 characters';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Must be at least 8 characters';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setIsLoading(true);
    try {
      const user = await register(form.email, form.username, form.password);
      if (user?.newUser === true) {
        setTransitioning(true);
        navigate('/skills');
      } else {
        setTransitioning(true);
        navigate('/guilds');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.error?.details ||
        'Registration failed. Please try again.';
      setServerError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsLoading(false);
    }
  };

  const change = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(er => ({ ...er, [field]: '' }));
  };

  return (
    <div style={styles.page}>
      <div style={styles.leftPanel}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>📜</span>
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

      <div style={styles.rightPanel}>
        <div style={styles.formCard}>
          <h1 style={styles.title}>Register</h1>
          {serverError && <div style={styles.serverError}>{serverError}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <Field label="Email" type="email" placeholder="Enter email"
              value={form.email} onChange={change('email')} error={errors.email} />
            <Field label="Username" type="text" placeholder="Enter username"
              value={form.username} onChange={change('username')} error={errors.username} />
            <Field label="Password" type="password" placeholder="Enter password"
              value={form.password} onChange={change('password')} error={errors.password} />
            <button type="submit" style={{ ...styles.btn, opacity: isLoading ? 0.7 : 1 }} disabled={isLoading}>
              {isLoading ? 'Enrolling...' : 'Sign Up'}
            </button>
          </form>
          <p style={styles.switchText}>
            Already have an account? <Link to="/login" style={styles.link}>Sign in instead</Link>
          </p>
          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerLabel}>or</span>
            <span style={styles.dividerLine} />
          </div>
          <div style={styles.googleWrap}>
            <GoogleSignInButton mode="signup" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, placeholder, value, onChange, error }: {
  label: string; type: string; placeholder: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; error?: string;
}) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}
        style={{ ...styles.input, ...(error ? styles.inputError : {}) }} />
      {error && <span style={styles.errorMsg}>{error}</span>}
    </div>
  );
}

const FEATURES = [
  { icon: '📋', text: 'Browse real-time community tasks. Find a mission that matches your skills.' },
  { icon: '🏠', text: 'Work together with people you actually know in dedicated sub-groups.' },
  { icon: '⭐', text: 'Volunteer out of good will or be rewarded for your hard work via Stripe, all heroes are welcome!' },
];

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: "'Prompt', sans-serif", backgroundColor: '#f5f5f5' },
  leftPanel: { width: '340px', minWidth: '340px', backgroundColor: '#52734D', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '24px' },
  logo: { display: 'flex', alignItems: 'center', gap: '8px' },
  logoIcon: { fontSize: '22px' },
  logoText: { color: '#fff', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.3px' },
  mascot: { fontSize: '80px', textAlign: 'center', marginTop: '8px' },
  features: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' },
  featureCard: { backgroundColor: 'rgba(221,255,188,0.35)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' },
  featureIcon: { fontSize: '18px', flexShrink: 0, marginTop: '2px' },
  featureText: { color: '#fff', fontSize: '13px', lineHeight: '1.5', margin: 0 },
  rightPanel: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' },
  formCard: { width: '100%', maxWidth: '380px' },
  title: { color: '#34C759', fontWeight: 700, fontSize: '40px', margin: '0 0 28px' },
  serverError: { backgroundColor: '#ffe5e5', color: '#c73434', border: '1px solid #f5c6c6', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', marginBottom: '16px' },
  fieldGroup: { marginBottom: '18px' },
  label: { display: 'block', color: '#34C759', fontWeight: 600, fontSize: '14px', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'Prompt', sans-serif", transition: 'border-color 0.2s' },
  inputError: { borderColor: '#c73434' },
  errorMsg: { color: '#c73434', fontSize: '12px', marginTop: '4px', display: 'block' },
  btn: { width: '100%', padding: '13px', backgroundColor: '#34C759', color: '#fff', border: 'none', borderRadius: '50px', fontWeight: 700, fontSize: '16px', cursor: 'pointer', marginTop: '8px', fontFamily: "'Prompt', sans-serif" },
  switchText: { textAlign: 'center', fontSize: '13px', color: '#555', margin: '14px 0 18px' },
  link: { color: '#34C759', textDecoration: 'none', fontWeight: 600 },
  divider: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  dividerLine: { flex: 1, height: '1px', backgroundColor: '#e0e0e0', display: 'block' },
  dividerLabel: { color: '#aaa', fontSize: '13px', flexShrink: 0 },
  googleWrap: { display: 'flex', justifyContent: 'center' },
};