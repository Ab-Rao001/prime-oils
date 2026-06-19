import React, { useState, useEffect, Suspense } from 'react';
import C from '../theme';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import BottomNav from '../components/BottomNav';
import PageLoader from '../components/PageLoader';
import { NAV_BY_ROLE } from '../config/navigation';
import { userApi } from '../api/userApi';


const Overview = React.lazy(() => import('./Overview'));
const SupplierDashboard = React.lazy(() => import('./SupplierDashboard'));
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
const Profile = React.lazy(() => import('./Profile'));
const Transactions = React.lazy(() => import('./Transactions'));
const PurchaseOrders = React.lazy(() => import('./PurchaseOrders'));
const Expenses = React.lazy(() => import('./Expenses'));
const Dispatch = React.lazy(() => import('./Dispatch'));

const PAGES = {
  overview: Overview,
  supplierDashboard: SupplierDashboard,
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
  profile: Profile,
  transactions: Transactions,
  purchaseOrders: PurchaseOrders,
  expenses: Expenses,
  dispatch: Dispatch,
};

export default function Dashboard({ user, onLogout }) {
  const navIds = NAV_BY_ROLE[user.role] || NAV_BY_ROLE.admin;
  const [active, setActive] = useState(navIds[0] || 'overview');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
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
    userApi.getNotifications().then(setNotifications).catch(() => setNotifications([]));
    
    const handleNewNotification = (e) => {
      setNotifications(prev => [e.detail, ...prev]);
    };
    window.addEventListener('new-notification', handleNewNotification);
    return () => window.removeEventListener('new-notification', handleNewNotification);
  }, []);

  useEffect(() => {
    if (active !== 'orders' && active !== 'users') return;
    userApi.getUsers().then(setUsers).catch(() => setUsers([]));
  }, [active]);

  const addNotification = async ({ type, msg }) => {
    try {
      const created = await userApi.createNotification({ type, msg });
      setNotifications(prev => [created, ...prev]);
    } catch {
      const date = new Date().toLocaleString('en-US', { month: 'short', day: '2-digit' });
      setNotifications(prev => [{ id: Date.now(), type, msg, date, read: false }, ...prev]);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, overflow: 'hidden', position: 'relative' }}>
      {/* Sidebar hidden on mobile, replaced by BottomNav */}
      {!isMobile && (
        <Sidebar
          user={user}
          active={active}
          onNav={setActive}
          onLogout={() => setShowLogoutConfirm(true)}
          notifications={notifications}
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
            padding: isMobile ? '16px 14px 80px' : '22px 24px', // Extra bottom padding for TabBar
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
      
      {isMobile && <BottomNav />}

      {/* Custom Logout Modal */}
      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            style={{
              background: C.card, borderRadius: 16, padding: '32px 24px', width: '100%', maxWidth: 360,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)', textAlign: 'center',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 20, color: C.text, fontWeight: 700 }}>Ready to leave?</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: 14, color: C.muted }}>You are about to securely log out of your Prime Oil account.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, padding: '12px 0', background: 'transparent', border: `1.5px solid ${C.border}`,
                  borderRadius: 10, color: C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={onLogout}
                style={{
                  flex: 1, padding: '12px 0', background: C.danger, border: 'none',
                  borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
