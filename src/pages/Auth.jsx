import React, { useState } from 'react';
import { auth, db } from '../Firebase/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { getAuthErrorMessage, validateEmail, validatePassword } from '../Firebase/authUtils';
import ForgotPassword from './ForgotPassword';

export default function Auth({ defaultTab = 'login' }) {
  const [tab, setTab] = useState(defaultTab);
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', name: '', role: 'shopkeeper' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(245,200,66,0.3)',
    borderRadius: 10,
    color: '#FDF6E3',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border 0.3s, background 0.3s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    color: 'rgba(245,200,66,0.9)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontWeight: 600,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2D4A2D 0%, #4A6B4A 50%, #6B8E6B 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      padding: 20,
      position: 'relative',
    }}>
      {/* Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(13, 42, 20, 0.35) 0%, rgba(34, 68, 34, 0.30) 100%)',
        zIndex: 0,
      }} />

      {/* Form Container */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'linear-gradient(145deg, rgba(45, 74, 45, 0.92), rgba(34, 68, 34, 0.92))',
        border: '1px solid rgba(245,200,66,0.3)',
        borderRadius: 16,
        padding: '2.8rem 2.5rem',
        position: 'relative',
        zIndex: 1,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.5rem',
            color: '#F5C842',
            fontWeight: 700,
            marginBottom: 8,
          }}>
            Prime <span style={{ color: '#D4880A', fontStyle: 'italic' }}>Oil</span>
          </div>
          <div style={{
            fontSize: 12,
            color: 'rgba(245,200,66,0.7)',
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: 500,
          }}>
            Management System
          </div>
        </div>

        {/* Tab Navigation */}
        {tab !== 'forgot' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 26, background: 'rgba(255,255,255,0.08)', padding: 6, borderRadius: 12 }}>
            {[
              { key: 'login', label: 'Login' },
              { key: 'signup', label: 'Sign Up' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setError('');
                }}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.3s',
                  background: tab === t.key ? '#F5C842' : 'transparent',
                  color: tab === t.key ? '#0D0A05' : 'rgba(253,246,227,0.7)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Login Form */}
        {tab === 'login' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                value={form.email || ''}
                onChange={e => setForm({ ...form, email: e.target.value })}
                onKeyPress={e => e.key === 'Enter' && !loading && handleLogin()}
                placeholder="admin@primeoil.com"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={form.password || ''}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyPress={e => e.key === 'Enter' && !loading && handleLogin()}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? 'rgba(150,150,150,0.6)' : '#F5C842',
                color: '#0D0A05',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(245,200,66,0.3)',
                transition: 'all 0.3s',
                marginBottom: error ? 12 : 16,
              }}
            >
              {loading ? 'Logging in...' : 'Login to Dashboard'}
            </button>

            <button
              onClick={() => {
                setTab('forgot');
                setError('');
              }}
              style={{
                width: '100%',
                padding: '10px',
                background: 'transparent',
                color: 'rgba(245,200,66,0.8)',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'color 0.3s',
              }}
              onMouseEnter={e => e.target.style.color = '#F5C842'}
              onMouseLeave={e => e.target.style.color = 'rgba(245,200,66,0.8)'}
            >
              Forgot Password?
            </button>

            {error && (
              <div style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                fontSize: 12,
                border: '1px solid rgba(239, 68, 68, 0.3)',
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Signup Form */}
        {tab === 'signup' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                value={form.email || ''}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="your@email.com"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={form.password || ''}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={inputStyle}
              />
              <div style={{ fontSize: 11, color: 'rgba(245,200,66,0.6)', marginTop: 6 }}>
                Min 6 characters
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword || ''}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Role</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                style={{
                  ...inputStyle,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                }}
              >
                <option value="shopkeeper">Shopkeeper</option>
                <option value="salesman">Salesman</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>

            <button
              onClick={handleSignup}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? 'rgba(150,150,150,0.6)' : '#F5C842',
                color: '#0D0A05',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(245,200,66,0.3)',
                transition: 'all 0.3s',
                marginBottom: error ? 12 : 0,
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            {error && (
              <div style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                fontSize: 12,
                border: '1px solid rgba(239, 68, 68, 0.3)',
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Forgot Password Form */}
        {tab === 'forgot' && (
          <ForgotPassword onBack={() => {
            setTab('login');
            setError('');
          }} />
        )}
      </div>
    </div>
  );

  async function handleLogin() {
    const email = String(form.email || '').trim().toLowerCase();
    const password = String(form.password || '').trim();

    if (!email) return setError('Please enter your email.');
    if (!validateEmail(email)) return setError('Please enter a valid email.');
    if (!password) return setError('Please enter your password.');

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setForm({ email: '', password: '', confirmPassword: '', name: '', role: 'shopkeeper' });
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    const name = String(form.name || '').trim();
    const email = String(form.email || '').trim().toLowerCase();
    const password = String(form.password || '').trim();
    const confirmPassword = String(form.confirmPassword || '').trim();

    if (!name) return setError('Please enter your full name.');
    if (!email) return setError('Please enter your email.');
    if (!validateEmail(email)) return setError('Please enter a valid email.');
    if (!password) return setError('Please enter a password.');

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return setError('Password must be at least 6 characters.');
    }

    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        role: form.role,
        status: 'active',
        createdAt: new Date(),
      });

      setForm({ email: '', password: '', confirmPassword: '', name: '', role: 'shopkeeper' });
      setTab('login');
      setError('');
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  }
}
