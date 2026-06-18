import React, { useState, useEffect, Suspense } from 'react';
import C from '../theme';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import PageLoader from '../components/PageLoader';
import { NAV_BY_ROLE } from '../config/navigation';
import { api } from '../api/client';


const Overview = React.lazy(() => import('./Overview'));
const Inventory = React.lazy(() => import('./Inventory'));
const Orders = React.lazy(() => import('./Orders'));
const Payments = React.lazy(() => import('./Payments'));
const CashFlow = React.lazy(() => import('./CashFlow'));
const Notifications = React.lazy(() => import('./Notifications'));
const Complaints = React.lazy(() => import('./Complaints'));
const Marketing = React.lazy(() => import('./Marketing'));
const Shopkeepers = React.lazy(() => import('./Shopkeepers'));
const Reports = React.lazy(() => import('./Reports'));
const UserManagement = React.lazy(() => import('./UserManagement'));

const PAGES = {
  overview: Overview,
  inventory: Inventory,
  orders: Orders,
  payments: Payments,
  cashflow: CashFlow,
  notifications: Notifications,
  complaints: Complaints,
  marketing: Marketing,
  shopkeepers: Shopkeepers,
  reports: Reports,
  users: UserManagement,
};

const NEEDS_FIREBASE_USERS = new Set(['orders', 'users']);

export default function Dashboard({ user, onLogout }) {
  const navIds = NAV_BY_ROLE[user.role] || NAV_BY_ROLE.admin;
  const [active, setActive] = useState(navIds[0] || 'overview');
  
  // Responsive sidebar toggles based on screen width
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sideOpen, setSideOpen] = useState(window.innerWidth > 768);
  
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);

  const PageComponent = PAGES[active] || Overview;

  // Window resize listener
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSideOpen(true); // Always show sidebar on desktop
      } else {
        setSideOpen(false); // Hide overlay drawer on mobile resize by default
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    api.getNotifications().then(setNotifications).catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    if (!NEEDS_FIREBASE_USERS.has(active)) return;
    api.getUsers().then(setUsers).catch(() => setUsers([]));
  }, [active]);

  const addNotification = async ({ type, msg }) => {
    try {
      const created = await api.createNotification({ type, msg });
      setNotifications(prev => [created, ...prev]);
    } catch {
      const date = new Date().toLocaleString('en-US', { month: 'short', day: '2-digit' });
      setNotifications(prev => [{ id: Date.now(), type, msg, date, read: false }, ...prev]);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, overflow: 'hidden', position: 'relative' }}>
      {/* Responsive Sidebar */}
      {(sideOpen || isMobile) && (
        <Sidebar
          user={user}
          active={active}
          onNav={setActive}
          onLogout={onLogout}
          notifications={notifications}
          mobileOpen={isMobile && sideOpen}
          onClose={() => isMobile && setSideOpen(false)}
        />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar
          user={user}
          active={active}
          sidebarOpen={sideOpen}
          onToggleSidebar={() => setSideOpen(o => !o)}
        />

        <main
          id="main-content"
          role="main"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '16px 14px' : '22px 24px',
            outline: 'none',
          }}
          tabIndex="-1"
        >
          <Suspense fallback={<PageLoader />}>
            <PageComponent
              role={user.role}
              user={user}
              users={users}
              onNavigate={setActive}
              onSendNotification={addNotification}
              notifications={notifications}
              setNotifications={setNotifications}
            />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
