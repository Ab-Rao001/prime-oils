import React from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import { userApi } from '../api/userApi';

const ICONS = { PAYMENT: '💳', ORDER: '🛒', INVENTORY: '📦', COMPLAINT: '⚠️', DELIVERY: '🚚', SECURITY: '🔒', SYSTEM: '⚙️', payment: '💳', order: '🛒', stock: '📦', complaint: '⚠️', delivery: '🚚' };
const COLS  = { PAYMENT: C.warn, ORDER: C.info, INVENTORY: C.danger, COMPLAINT: C.danger, DELIVERY: C.success, SECURITY: C.danger, SYSTEM: C.gold, payment: C.warn, order: C.info, stock: C.danger, complaint: C.danger, delivery: C.success };

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

  const markRead = async id => {
    try {
      await userApi.markNotificationRead(id);
    } catch { /* local fallback */ }
    setNotifs(prev => prev.map(n => (n.id === id || n._id === id ? { ...n, read: true, isRead: true } : n)));
  };

  const markAll = async () => {
    try {
      const updated = await userApi.markAllNotificationsRead();
      setNotifs(updated);
    } catch {
      setNotifs(prev => prev.map(n => (isVisible(n) ? { ...n, read: true, isRead: true } : n)));
    }
  };

  const unread = visible.filter(n => !(n.isRead ?? n.read)).length;

  return (
    <div className="page-enter">
      <div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h2 style={ { fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>Notifications</h2>
          <p style={ { color: C.muted, fontSize: 12, marginTop: 2 }}>{unread} unread</p>
        </div>
        <button
          onClick={markAll}
          style={ { padding: '7px 14px', background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 8, color: C.gold, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
        >
          Mark all read
        </button>
      </div>

      <div style={ { display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map(n => {
          const isRead = n.isRead ?? n.read;
          const msg = n.message || n.msg;
          const title = n.title || 'Notification';
          const isCritical = n.priority === 'CRITICAL';
          return (
            <div
              key={n.id || n._id}
              onClick={() => markRead(n.id || n._id)}
              style={ {
                background: C.card,
                border: `1px solid ${isRead ? C.border : (isCritical ? C.danger : C.goldBorder)}`,
                borderLeft: isCritical ? `4px solid ${C.danger}` : (n.priority === 'HIGH' ? `4px solid ${C.warn}` : undefined),
                borderRadius: 12, padding: '13px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                opacity: isRead ? 0.65 : 1,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={ {
                width: 36, height: 36, borderRadius: 10,
                background: `${COLS[n.type] || C.gold}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
              }}>
                {ICONS[n.type] || '🔔'}
              </div>
              <div style={ { flex: 1 }}>
                <h4 style={ { margin: '0 0 4px 0', fontSize: 14, color: isCritical ? C.danger : C.text, fontWeight: 700 }}>{title}</h4>
                <p style={ { margin: 0, fontSize: 13, color: C.text, fontWeight: isRead ? 400 : 600, lineHeight: 1.5 }}>{msg}</p>
                <div style={ { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={ { fontSize: 11, color: C.muted }}>{n.date || (n.createdAt ? new Date(n.createdAt).toLocaleString() : '')}</span>
                  <Badge s={n.type} />
                  {n.priority && <Badge s={n.priority} />}
                </div>
              </div>
              {!isRead && (
                <div style={ { width: 7, height: 7, borderRadius: '50%', background: C.gold, marginTop: 4, flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
