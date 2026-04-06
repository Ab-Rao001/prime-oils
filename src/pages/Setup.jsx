import React, { useState } from 'react';
import { initializeDemoUsers } from '../Firebase/firebaseInit';

export default function Setup({ onSetupComplete }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleInitialize = async () => {
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      await initializeDemoUsers();
      setMessage('✓ Demo users initialized successfully! You can now login with the demo credentials.');
      setMessageType('success');
      
      // Redirect back to landing after 2 seconds
      setTimeout(() => {
        onSetupComplete?.();
      }, 2000);
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    onSetupComplete?.();
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
    }}>
      <div style={{
        maxWidth: 500,
        background: 'linear-gradient(145deg, rgba(45, 74, 45, 0.95), rgba(34, 68, 34, 0.95))',
        border: '1px solid rgba(245,200,66,0.4)',
        borderRadius: 22,
        padding: '2.2rem 2.5rem',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <h1 style={{ color: '#F5C842', fontSize: 24, marginBottom: 10, textAlign: 'center' }}>
          Setup Prime Oil System
        </h1>

        <p style={{ color: 'rgba(245,200,66,0.8)', textAlign: 'center', marginBottom: 20, fontSize: 14 }}>
          Initialize demo users to get started with the application
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(245,200,66,0.2)',
          borderRadius: 12,
          padding: 15,
          marginBottom: 20,
          fontSize: 12,
          color: '#FDF6E3',
          lineHeight: 1.6,
        }}>
          <p style={{ fontWeight: 600, marginBottom: 10, color: '#F5C842' }}>Demo Users:</p>
          <p>📧 admin@primeoil.com | 🔐 Admin@123</p>
          <p>📧 ali@shop.com | 🔐 Shop@123</p>
          <p>📧 kamran@primeoil.com | 🔐 Sales@123</p>
          <p style={{ marginTop: 10 }}>📧 supply@factory.com | 🔐 Supply@123</p>
        </div>

        <button
          onClick={handleInitialize}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#999' : '#F5C842',
            color: '#0D0A05',
            border: 'none',
            borderRadius: 50,
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(245,200,66,0.4)',
            opacity: loading ? 0.7 : 1,
            marginBottom: message ? 15 : 0,
            transition: 'all 0.3s',
          }}
        >
          {loading ? 'Initializing...' : 'Initialize Demo Users'}
        </button>

        {message && (
          <div style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: messageType === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: messageType === 'success' ? '#86efac' : '#fca5a5',
            fontSize: 13,
            border: `1px solid ${messageType === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            textAlign: 'center',
            marginBottom: 15,
          }}>
            {message}
          </div>
        )}

        <button
          onClick={handleGoBack}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(255,255,255,0.1)',
            color: '#F5C842',
            border: '1px solid rgba(245,200,66,0.3)',
            borderRadius: 50,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 15,
          }}
        >
          ← Back to Landing
        </button>

        <p style={{ color: 'rgba(245,200,66,0.6)', fontSize: 11, marginTop: 20, textAlign: 'center', lineHeight: 1.5 }}>
          ℹ️ This will create demo users in Firebase. If users already exist, they will be skipped.
        </p>
      </div>
    </div>
  );
}
