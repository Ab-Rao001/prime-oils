export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: '🏠' },
  { id: 'inventory', label: 'Inventory', icon: '📦' },
  { id: 'orders', label: 'Orders', icon: '🛒' },
  { id: 'payments', label: 'Payments', icon: '💳' },
  { id: 'cashflow', label: 'Cash Flow', icon: '💰' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'complaints', label: 'Complaints', icon: '💬' },
  { id: 'marketing', label: 'Marketing', icon: '📣' },
  { id: 'shopkeepers', label: 'Shopkeepers', icon: '👥' },
  { id: 'reports', label: 'Reports', icon: '📊' },
  { id: 'users', label: 'User Mgmt', icon: '⚙️' },
];

export const NAV_BY_ROLE = {
  admin: ['overview', 'inventory', 'orders', 'payments', 'cashflow', 'notifications', 'complaints', 'marketing', 'shopkeepers', 'reports', 'users'],
  shopkeeper: ['overview', 'orders', 'payments', 'notifications', 'complaints', 'reports'],
  salesman: ['overview', 'orders', 'payments', 'inventory', 'notifications', 'shopkeepers', 'reports'],
  supplier: ['inventory', 'orders', 'notifications'],
};
