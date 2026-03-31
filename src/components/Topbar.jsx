import React from 'react';
import C from '../theme';
import { NAV_ITEMS } from '../data/mockData';

export default function Topbar({ user, active, onToggleSidebar }) {
  const currentPage = NAV_ITEMS.find(n => n.id === active)?.label || 'Overview';

  return (
    <header style={{
      height: 52,
      background: C.card,
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center',
      padding: '0 18px', gap: 10, flexShrink: 0,
    }}>
      <button onClick={onToggleSidebar} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 6, borderRadius: 7, color: C.muted, fontSize: 16, lineHeight: 1,
      }}>
        ☰
      </button>

      <div style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}>
        <span style={{ color: C.gold, fontWeight: 600, textTransform: 'capitalize' }}>{user.role}</span>
        <span style={{ color: C.border }}>›</span>
        <span style={{ fontWeight: 500, color: C.text, textTransform: 'capitalize' }}>{currentPage}</span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px',
        background: C.goldBg, borderRadius: 8,
        border: `1px solid ${C.goldBorder}`,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.success }} />
        <span style={{ fontSize: 12, color: C.gold, fontWeight: 500 }}>{user.name}</span>
      </div>
    </header>
  );
}
