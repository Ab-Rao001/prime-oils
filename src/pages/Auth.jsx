import React, { useState } from 'react';

export default function Auth({ defaultTab = 'login', users = [], onCreateUser, onLogin }) {
  const [tab,  setTab]  = useState(defaultTab);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'admin' });
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(245,200,66,0.4)',
    borderRadius: 9, color: '#FDF6E3', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: 10, color: 'rgba(245,200,66,0.8)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 5 };

  return (
    <div style={{
      minHeight: '100vh',
      // CANOLIVE image background - add your image to public/canlive-bg.jpg or use the gradient below
      backgroundImage: 'url(/canlive-bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      // Fallback gradient matching CANOLIVE theme (darker olive green to lighter yellowish-green)
      background: 'linear-gradient(135deg, #2D4A2D 0%, #4A6B4A 50%, #6B8E6B 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif", padding: 20,
      position: 'relative',
    }}>
      {/* Overlay for better form readability - reduced opacity to show background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, rgba(13, 42, 20, 0.35) 0%, rgba(34, 68, 34, 0.30) 100%)',
        zIndex: 0,
      }} />
      <div style={{
        width: '100%', maxWidth: 430,
        background: 'linear-gradient(145deg, rgba(45, 74, 45, 0.85), rgba(34, 68, 34, 0.85))',
        border: '1px solid rgba(245,200,66,0.4)',
        borderRadius: 22, padding: '2.2rem 2.5rem',
        position: 'relative',
        zIndex: 1,
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', color: '#F5C842', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            Prime <em style={{ color: '#D4880A' }}>Oil</em> Suppliers
          </div>
          <div style={{ fontSize: 11, color: 'rgba(245,200,66,0.7)', letterSpacing: 2, marginTop: 3, textTransform: 'uppercase' }}>
            Management System
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: 50, padding: 4, marginBottom: 20, gap: 4 }}>
          {['login', 'signup'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '7px', border: 'none', borderRadius: 50, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.25s',
                background: tab === t ? '#F5C842' : 'transparent',
                color: tab === t ? '#0D0A05' : 'rgba(253,246,227,0.7)',
              }}
            >
              {t === 'login' ? 'Login' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Login form */}
        {tab === 'login' && (
          <div>
            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(245,200,66,0.3)' }} />
              <span style={{ color: 'rgba(245,200,66,0.7)', fontSize: 11 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(245,200,66,0.3)' }} />
            </div>

            <div style={{ marginBottom: 13 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={form.email || ''}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 13 }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={form.password || ''}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Role</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                style={{ ...inputStyle }}
              >
                {['admin', 'shopkeeper', 'salesman', 'supplier'].map(r => (
                  <option key={r} value={r} style={{ background: '#2D4A2D', color: '#FDF6E3' }}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                const email = String(form.email || '').trim().toLowerCase();
                if (!email) return setError('Please enter your email.');

                const found = users.find(u => String(u.email || '').trim().toLowerCase() === email);
                if (!found) {
                  setError('Email not found in registered users.');
                  return;
                }

                setError('');
                onLogin({ name: found.name, email: found.email, role: found.role, status: found.status });
              }}
              style={{ width: '100%', padding: '11px', background: '#F5C842', color: '#0D0A05', border: 'none', borderRadius: 50, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(245,200,66,0.4)' }}
            >
              Login to Dashboard →
            </button>

            {error && (
              <div style={{ marginTop: 10, color: '#F59E0B', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Sign up form */}
        {tab === 'signup' && (
          <div>
            <div style={{ marginBottom: 13 }}>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 13 }}>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                value={form.email || ''}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 13 }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={form.password || ''}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Role</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                style={{ ...inputStyle }}
              >
                {['shopkeeper', 'salesman', 'supplier'].map(r => (
                  <option key={r} value={r} style={{ background: '#2D4A2D', color: '#FDF6E3' }}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                const name = String(form.name || '').trim();
                const email = String(form.email || '').trim().toLowerCase();
                if (!name) return setError('Please enter your full name.');
                if (!email) return setError('Please enter your email.');

                const exists = users.some(u => String(u.email || '').trim().toLowerCase() === email);
                if (exists) {
                  setError('Email already exists.');
                  return;
                }

                const nextId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
                const newUser = { id: nextId, name, email, role: form.role, status: 'active' };
                onCreateUser?.(newUser);
                setError('');
                onLogin({ name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status });
              }}
              style={{ width: '100%', padding: '11px', background: '#F5C842', color: '#0D0A05', border: 'none', borderRadius: 50, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(245,200,66,0.4)' }}
            >
              Create Account →
            </button>

            {error && (
              <div style={{ marginTop: 10, color: '#F59E0B', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
