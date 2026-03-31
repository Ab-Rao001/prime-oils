import React from 'react';
import C from '../theme';
import { NAV_ITEMS, NAV_BY_ROLE } from '../data/mockData';

export default function Sidebar({ user, active, onNav, onLogout, notifications = [] }) {
  const navIds   = NAV_BY_ROLE[user.role] || NAV_BY_ROLE.admin;
  const navItems = NAV_ITEMS.filter(n => navIds.includes(n.id));
  const isVisible = n => {
    if (user.role === 'admin') return true;
    if (user.role === 'shopkeeper') return n.msg.toLowerCase().includes(user.name.toLowerCase());
    if (user.role === 'salesman') return n.type === 'payment' || n.type === 'order';
    if (user.role === 'supplier') return n.type === 'order';
    return true;
  };
  const unread = notifications.filter(n => !n.read && isVisible(n)).length;

  return (
    <aside className="sidebar" style={{
      width: 226, minWidth: 226,
      background: C.sb,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '16px 14px 10px', borderBottom: `1px solid ${C.sbBorder}`, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', color: '#F5C842' }}>
          Prime <em style={{ color: '#D4880A' }}>Oil</em>
        </div>
        <div style={{ fontSize: 9, color: 'rgba(253,246,227,0.28)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 1 }}>
          Management System
        </div>
      </div>

      {/* User chip */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.sbBorder}`, display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'rgba(212,136,10,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#F5C842', flexShrink: 0,
        }}>
          {user.name.charAt(0)}
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(253,246,227,0.88)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.name}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(253,246,227,0.32)', textTransform: 'capitalize' }}>
            {user.role}
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(item => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className={`nav-btn${isActive ? ' active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 9, border: 'none',
                cursor: 'pointer',
                background: isActive ? 'rgba(212,136,10,0.15)' : 'transparent',
                color: isActive ? '#F5C842' : 'rgba(253,246,227,0.42)',
                textAlign: 'left', position: 'relative',
                whiteSpace: 'nowrap', fontSize: 13,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', left: 0, top: '14%',
                  width: 3, height: '72%',
                  background: C.gold, borderRadius: '0 3px 3px 0',
                }} />
              )}
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
              {item.id === 'notifications' && unread > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: C.danger, color: 'white',
                  fontSize: 9, borderRadius: 8, padding: '2px 6px', fontWeight: 700,
                }}>
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '8px', borderTop: `1px solid ${C.sbBorder}`, flexShrink: 0 }}>
        <button onClick={onLogout} style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 10px', borderRadius: 9, border: 'none',
          cursor: 'pointer', background: 'transparent',
          color: 'rgba(253,246,227,0.28)', width: '100%', fontSize: 13,
        }}>
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
