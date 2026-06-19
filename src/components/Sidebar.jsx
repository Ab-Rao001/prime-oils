import React from 'react';
import C from '../theme';
import { NAV_ITEMS, NAV_BY_ROLE } from '../config/navigation';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar({
  user,
  active,
  onNav,
  onLogout,
  notifications = [],
  mobileOpen = false,
  onClose = () => {}
}) {
  const { isDark, toggleTheme } = useTheme();
  const navIds   = NAV_BY_ROLE[user.role] || NAV_BY_ROLE.admin;
  const navItems = NAV_ITEMS.filter(n => navIds.includes(n.id));
  const isVisible = n => {
    if (user.role === 'admin') return true;
    if (user.role === 'shopkeeper') return n.msg.toLowerCase().includes(user.name.toLowerCase());
    if (user.role === 'salesman') return n.type === 'payment' || n.type === 'order';
    if (user.role === 'supplier') return n.type === 'order';
    return true;
  };
  const unread = notifications.filter(n => !(n.isRead ?? n.read) && isVisible(n)).length;

  const [openComplaints, setOpenComplaints] = React.useState(0);
  React.useEffect(() => {
    if (user.role === 'admin' || user.role === 'shopkeeper') {
      import('../api/userApi').then(({ userApi }) => {
        userApi.getComplaints().then(res => {
          const data = res.data || res;
          if (Array.isArray(data)) {
            const open = data.filter(c => c.status === 'pending' || c.status === 'processing').length;
            setOpenComplaints(open);
          }
        }).catch(() => {});
      });
    }
  }, [user]);

  return (
    <>
      {/* Mobile background overlay click catcher */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(13, 42, 20, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 999
          }}
        />
      )}

      <aside
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}
        role="navigation"
        aria-label="Main dashboard menu"
        style={{
          width: 226,
          minWidth: 226,
          background: C.sb,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '100%'
        }}
      >
        {/* Logo */}
        <div style={{ padding: '16px 14px 10px', borderBottom: `1px solid ${C.sbBorder}`, flexShrink: 0 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', color: '#F5C842' }}>
            Prime <em style={{ color: '#D4880A' }}>Oil</em>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(253,246,227,0.28)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 1 }}>
            Management System
          </div>
        </div>

        {/* User Info Card */}
        <div 
          onClick={() => {
            onNav('profile');
            onClose();
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          style={{ padding: '12px 14px', borderBottom: `1px solid ${C.sbBorder}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, cursor: 'pointer', transition: 'background 0.2s ease' }}
        >
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(212,136,10,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#F5C842', flexShrink: 0,
              border: `1.5px solid ${C.goldBorder}`,
              overflow: 'hidden'
            }} aria-hidden="true">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="User Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div style={{
              position: 'absolute', bottom: -2, right: -2, width: 10, height: 10,
              background: C.success, borderRadius: '50%', border: `2px solid ${C.sb}`,
            }} title="Active Status"></div>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(253,246,227,0.95)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(253,246,227,0.4)', textTransform: 'capitalize' }}>
              {user.role}
            </div>
          </div>
        </div>

        {/* Nav links links list */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNav(item.id);
                  onClose(); // Automatically close mobile drawer on click
                }}
                className={`nav-btn${isActive ? ' active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 9, border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(212,136,10,0.15)' : 'transparent',
                  color: isActive ? '#F5C842' : 'rgba(253,246,227,0.85)',
                  textAlign: 'left', position: 'relative',
                  whiteSpace: 'nowrap', fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s ease',
                }}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute', left: 0, top: '14%',
                    width: 3, height: '72%',
                    background: C.gold, borderRadius: '0 3px 3px 0',
                  }} />
                )}
                {item.label}
                {item.id === 'notifications' && unread > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: C.danger, color: 'white',
                      fontSize: 9, borderRadius: 8, padding: '2px 6px', fontWeight: 700,
                    }}
                    aria-label={`${unread} unread notifications`}
                  >
                    {unread}
                  </span>
                )}
                {item.id === 'complaints' && openComplaints > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: C.danger, color: 'white',
                      fontSize: 9, borderRadius: 8, padding: '2px 6px', fontWeight: 700,
                    }}
                    aria-label={`${openComplaints} open complaints`}
                  >
                    {openComplaints}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Controls */}
        <div style={{ padding: '8px', borderTop: `1px solid ${C.sbBorder}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 9, border: 'none',
              cursor: 'pointer', background: 'transparent',
              color: 'rgba(253,246,227,0.85)', width: '100%', fontSize: 14,
              fontWeight: 500, transition: 'all 0.15s ease',
            }}
            aria-label="Toggle dark mode"
          >
            <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
            <div style={{ width: 36, height: 20, background: isDark ? C.gold : 'rgba(255,255,255,0.2)', borderRadius: 20, position: 'relative', transition: 'background 0.3s ease' }}>
              <div style={{ position: 'absolute', top: 2, left: isDark ? 18 : 2, width: 16, height: 16, background: '#fff', borderRadius: '50%', transition: 'left 0.3s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
            </div>
          </button>
          
          <button
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 9, border: 'none',
              cursor: 'pointer', background: 'transparent',
              color: 'rgba(253,246,227,0.85)', width: '100%', fontSize: 14,
              fontWeight: 500, transition: 'all 0.15s ease',
            }}
            aria-label="Logout from account"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
