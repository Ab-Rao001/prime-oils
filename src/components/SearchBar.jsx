import React from 'react';
import C from '../theme';

export default function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative', width: 260, marginBottom: 14 }}>
      <span style={{
        position: 'absolute', left: 10, top: '50%',
        transform: 'translateY(-50%)', color: C.muted, fontSize: 14,
      }}>🔍</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Search...'}
        style={{
          width: '100%', paddingLeft: 32, height: 34,
          border: `1px solid ${C.border}`, borderRadius: 8,
          fontSize: 13, color: C.text, background: C.card,
          outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
