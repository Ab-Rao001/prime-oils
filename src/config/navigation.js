export const NAV_ITEMS = [
  { id: 'supplierDashboard', label: 'Supplier Dashboard', icon: '🏭', path: 'supplier-dashboard' },
  { id: 'overview', label: 'Overview', icon: '🏠', path: 'overview' },
  { id: 'purchaseOrders', label: 'Purchase Orders', icon: '📥', path: 'purchase-orders' },
  { id: 'inventory', label: 'Inventory', icon: '📦', path: 'inventory' },
  { id: 'orders', label: 'Orders', icon: '🛒', path: 'orders' },
  { id: 'dispatch', label: 'Vehicles & Dispatch', icon: '🚚', path: 'dispatch' },
  { id: 'payments', label: 'Payments', icon: '💳', path: 'payments' },
  { id: 'expenses', label: 'Expenses', icon: '💸', path: 'expenses' },
  { id: 'transactions', label: 'Transactions', icon: '💳', path: 'transactions' },
  { id: 'cashflow', label: 'Cash Flow', icon: '💰', path: 'cashflow' },
  { id: 'notifications', label: 'Notifications', icon: '🔔', path: 'notifications' },
  { id: 'complaints', label: 'Complaints', icon: '💬', path: 'complaints' },
  { id: 'returns', label: 'Returns', icon: '↩️', path: 'returns' },
  { id: 'creditNotes', label: 'Credit Notes', icon: '🧾', path: 'credit-notes' },
  { id: 'marketing', label: 'Marketing', icon: '📣', path: 'marketing' },
  { id: 'shopkeepers', label: 'Shopkeepers', icon: '👥', path: 'shopkeepers' },
  { id: 'reports', label: 'Reports', icon: '📊', path: 'reports' },
  { id: 'users', label: 'User Management', icon: '⚙️', path: 'users' },
  { id: 'profile', label: 'Profile', icon: '👤', path: 'profile' },
];

export const NAV_BY_ROLE = {
  admin: ['overview', 'purchaseOrders', 'inventory', 'orders', 'dispatch', 'payments', 'expenses', 'cashflow', 'transactions', 'notifications', 'complaints', 'returns', 'creditNotes', 'marketing', 'shopkeepers', 'reports', 'users'],
  shopkeeper: ['overview', 'orders', 'payments', 'notifications', 'complaints', 'returns', 'creditNotes', 'reports'],
  salesman: ['overview', 'orders', 'payments', 'inventory', 'notifications', 'shopkeepers', 'complaints', 'returns', 'creditNotes', 'reports'],
  supplier: ['supplierDashboard', 'inventory', 'orders', 'dispatch', 'notifications', 'returns'],
};
