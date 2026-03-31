import React from 'react';
import C from '../theme';

export default function StatCard({ label, value, sub, color = C.gold, icon }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: '16px 20px',
      display: 'flex',
      gap: 14,
      alignItems: 'center',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 22,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}
