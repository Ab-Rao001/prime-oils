import React from 'react';
import C from '../theme';

export default function SectionHeader({ title, btn, onBtn }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h2>
      {btn && (
        <button onClick={onBtn} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: C.gold, color: 'white', border: 'none',
          borderRadius: 8, padding: '8px 16px', fontSize: 13,
          fontWeight: 600, cursor: 'pointer',
        }}>
          + {btn}
        </button>
      )}
    </div>
  );
}
