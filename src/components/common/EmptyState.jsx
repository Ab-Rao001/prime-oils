import React from 'react';
import C from '../../theme';

export default function EmptyState({ title = 'No data found', message = 'There are no records to display.', icon = '📭', actionBtn }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', background: C.card, borderRadius: 14,
      border: `1px dashed ${C.border}`, textAlign: 'center', margin: '24px 0'
    }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.8 }} aria-hidden="true">
        {icon}
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 8px 0' }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: C.muted, margin: '0 0 24px 0', maxWidth: 300 }}>
        {message}
      </p>
      {actionBtn && (
        <div>{actionBtn}</div>
      )}
    </div>
  );
}
