import React from 'react';
import C from '../theme';
import { NAV_ITEMS } from '../config/navigation';

export default function Topbar({ user, active, onToggleSidebar, sidebarOpen }) {
  const currentPage = NAV_ITEMS.find(n => n.id === active)?.label || 'Overview';

  return (
    <header
      role="banner"
      style={{
        height: 52,
        background: C.card,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 18px',
        gap: 10,
        flexShrink: 0,
        zIndex: 500,
        position: 'relative',
      }}
    >
      <button
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? "Collapse navigation sidebar" : "Expand navigation sidebar"}
        aria-expanded={sidebarOpen}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          borderRadius: 7,
          color: C.muted,
          fontSize: 18,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.15s ease',
        }}
      >
        ☰
      </button>

      <div style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}>
        <span style={{ color: C.gold, fontWeight: 600, textTransform: 'capitalize' }}>{user.role}</span>
        <span style={{ color: C.border }} aria-hidden="true">›</span>
        <span style={{ fontWeight: 500, color: C.text, textTransform: 'capitalize' }}>{currentPage}</span>
      </div>

    </header>
  );
}
