import React, { useState } from 'react';
import C from '../theme';
import Sidebar from '../components/Sidebar';
import Topbar  from '../components/Topbar';
import { NAV_BY_ROLE, NOTIFICATIONS } from '../data/mockData';

import Overview       from './Overview';
import Inventory      from './Inventory';
import Orders         from './Orders';
import Payments       from './Payments';
import CashFlow       from './CashFlow';
import Notifications  from './Notifications';
import Complaints     from './Complaints';
import Marketing      from './Marketing';
import Shopkeepers    from './Shopkeepers';
import Reports        from './Reports';
import UserManagement from './UserManagement';

const PAGES = {
  overview:      Overview,
  inventory:     Inventory,
  orders:        Orders,
  payments:      Payments,
  cashflow:      CashFlow,
  notifications: Notifications,
  complaints:    Complaints,
  marketing:     Marketing,
  shopkeepers:   Shopkeepers,
  reports:       Reports,
  users:         UserManagement,
};

export default function Dashboard({ user, onLogout, users, setUsers }) {
  const navIds = NAV_BY_ROLE[user.role] || NAV_BY_ROLE.admin;
  const [active,   setActive]   = useState(navIds[0] || 'overview');
  const [sideOpen, setSideOpen] = useState(true);

  const PageComponent = PAGES[active] || Overview;

  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const addNotification = ({ type, msg }) => {
    // Keep date short like the mock data (e.g. "Mar 15")
    const d = new Date();
    const date = d.toLocaleString('en-US', { month: 'short', day: '2-digit' });
    setNotifications(prev => ([
      ...prev,
      { id: Date.now(), type, msg, date, read: false },
    ]));
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, overflow: 'hidden' }}>

      {/* Sidebar */}
      {sideOpen && (
        <Sidebar
          user={user}
          active={active}
          onNav={setActive}
          onLogout={onLogout}
          notifications={notifications}
        />
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar
          user={user}
          active={active}
          onToggleSidebar={() => setSideOpen(o => !o)}
        />

        {/* Scrollable content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
          <PageComponent
            role={user.role}
            user={user}
            users={users}
            setUsers={setUsers}
            onNavigate={setActive}
            onSendNotification={addNotification}
            notifications={notifications}
            setNotifications={setNotifications}
          />
        </main>
      </div>
    </div>
  );
}
