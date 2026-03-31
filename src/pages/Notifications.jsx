import React from 'react';
import C from '../theme';
import Badge from '../components/Badge';

const ICONS = { payment: '💳', order: '🛒', stock: '📦', complaint: '⚠️', delivery: '🚚' };
const COLS  = { payment: C.warn, order: C.info, stock: C.danger, complaint: C.danger, delivery: C.success };

export default function Notifications({ role, user, notifications = [], setNotifications }) {
  const setNotifs = setNotifications;

  const isVisible = n => {
    if (role === 'admin') return true;
    if (role === 'shopkeeper') return (n.msg || '').toLowerCase().includes((user?.name || '').toLowerCase());
    if (role === 'salesman') return n.type === 'payment' || n.type === 'order';
    if (role === 'supplier') return n.type === 'order';
    return true;
  };

  const visible = notifications.filter(isVisible);

  const markRead = id =>
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const markAll = () =>
    setNotifs(prev => prev.map(n => (isVisible(n) ? { ...n, read: true } : n)));

  const unread = visible.filter(n => !n.read).length;

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>Notifications</h2>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{unread} unread</p>
        </div>
        <button
          onClick={markAll}
          style={{ padding: '7px 14px', background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 8, color: C.gold, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
        >
          Mark all read
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map(n => (
          <div
            key={n.id}
            onClick={() => markRead(n.id)}
            style={{
              background: C.card,
              border: `1px solid ${n.read ? C.border : C.goldBorder}`,
              borderRadius: 12, padding: '13px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 12,
              opacity: n.read ? 0.65 : 1,
              cursor: 'pointer', transition: 'opacity 0.2s',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${COLS[n.type] || C.gold}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
            }}>
              {ICONS[n.type] || '🔔'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, color: C.text, fontWeight: n.read ? 400 : 600, lineHeight: 1.5 }}>{n.msg}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: C.muted }}>{n.date}</span>
                <Badge s={n.type} />
              </div>
            </div>
            {!n.read && (
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.gold, marginTop: 4, flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
