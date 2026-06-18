import React from 'react';
import C from '../theme';

export function ApiError({ error, hint = 'Run: npm run server (and npm run server:seed once)' }) {
  if (!error) return null;
  return (
    <div style={{
      padding: '12px 16px',
      marginBottom: 16,
      borderRadius: 8,
      background: 'rgba(239, 68, 68, 0.08)',
      border: '1px solid rgba(239, 68, 68, 0.25)',
      color: C.danger,
      fontSize: 13,
    }}>
      <strong>Could not load data.</strong> {error.message || String(error)}
      <div style={{ marginTop: 4, fontSize: 12, color: C.muted }}>{hint}</div>
    </div>
  );
}

export function ApiEmpty({ message = 'No records yet.' }) {
  return <p style={{ color: C.muted, fontSize: 13, padding: 24 }}>{message}</p>;
}
