export const NAV_ITEMS = [
  { id: 'supplierDashboard', label: 'Supplier Dashboard', icon: '🏭' },
  { id: 'overview', label: 'Overview', icon: '🏠' },
  { id: 'purchaseOrders', label: 'Purchase Orders', icon: '📥' },
  { id: 'inventory', label: 'Inventory', icon: '📦' },
  { id: 'orders', label: 'Orders', icon: '🛒' },
  { id: 'dispatch', label: 'Fleet & Dispatch', icon: '🚚' },
  { id: 'payments', label: 'Payments', icon: '💳' },
  { id: 'expenses', label: 'Expenses', icon: '💸' },
  { id: 'transactions', label: 'Transactions', icon: '💳' },
  { id: 'cashflow', label: 'Cash Flow', icon: '💰' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'complaints', label: 'Complaints', icon: '💬' },
  { id: 'marketing', label: 'Marketing', icon: '📣' },
  { id: 'shopkeepers', label: 'Shopkeepers', icon: '👥' },
  { id: 'reports', label: 'Reports', icon: '📊' },
  { id: 'users', label: 'User Mgmt', icon: '⚙️' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export const NAV_BY_ROLE = {
  admin: ['overview', 'purchaseOrders', 'inventory', 'orders', 'dispatch', 'payments', 'expenses', 'cashflow', 'transactions', 'notifications', 'complaints', 'marketing', 'shopkeepers', 'reports', 'users'],
  shopkeeper: ['overview', 'orders', 'payments', 'notifications', 'complaints', 'reports'],
  salesman: ['overview', 'orders', 'dispatch', 'payments', 'inventory', 'notifications', 'shopkeepers', 'reports'],
  supplier: ['supplierDashboard', 'inventory', 'orders', 'dispatch', 'notifications'],
};
