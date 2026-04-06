import React, { useState } from 'react';
import { resetPassword } from '../Firebase/authUtils';
import { validateEmail } from '../Firebase/authUtils';

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

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
    transition: 'all 0.3s',
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

  const handleReset = async () => {
    const trimmedEmail = String(email || '').trim().toLowerCase();

    if (!trimmedEmail) {
      setMessageType('error');
      setMessage('Please enter your email address.');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setMessageType('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('');

    const result = await resetPassword(trimmedEmail);

    if (result.success) {
      setMessageType('success');
      setMessage('✓ Password reset email sent! Check your inbox and follow the link.');
      setEmail('');
      setTimeout(() => onBack?.(), 3000);
    } else {
      setMessageType('error');
      setMessage(result.error);
    }

    setLoading(false);
  };

  return (
    <div>
      <p style={{
        fontSize: 13,
        color: 'rgba(253,246,227,0.8)',
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 1.5,
      }}>
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Email Address</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleReset()}
          placeholder="your@email.com"
          style={{
            ...inputStyle,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        />
      </div>

      <button
        onClick={handleReset}
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
          opacity: loading ? 0.6 : 1,
          transition: 'all 0.3s',
          marginBottom: message ? 14 : 0,
        }}
      >
        {loading ? 'Sending...' : 'Send Reset Link'}
      </button>

      {message && (
        <div style={{
          padding: 12,
          borderRadius: 8,
          backgroundColor: messageType === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: messageType === 'success' ? '#86efac' : '#fca5a5',
          fontSize: 12,
          border: `1px solid ${messageType === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          textAlign: 'center',
          marginBottom: 14,
          lineHeight: 1.5,
        }}>
          {message}
        </div>
      )}

      <button
        onClick={onBack}
        style={{
          width: '100%',
          padding: '11px',
          background: 'rgba(255,255,255,0.08)',
          color: 'rgba(245,200,66,0.9)',
          border: '1px solid rgba(245,200,66,0.2)',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.3s',
        }}
      >
        ← Back to Login
      </button>
    </div>
  );
}
