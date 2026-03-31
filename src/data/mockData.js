export const PRODUCTS = [
  { id: 1, name: 'Sufi Cooking Oil',      cat: 'Cooking Oil', stock: 450, unit: 'Litre',  price: 350,  min: 100 },
  { id: 2, name: 'Dalda Banaspati',        cat: 'Banaspati',   stock: 280, unit: 'kg',     price: 420,  min: 80  },
  { id: 3, name: 'Canola Oil 5L',          cat: 'Cooking Oil', stock: 95,  unit: 'Bottle', price: 1800, min: 100 },
  { id: 4, name: 'Sunflower Oil 1L',       cat: 'Cooking Oil', stock: 320, unit: 'Bottle', price: 380,  min: 150 },
  { id: 5, name: 'Olive Oil Extra Virgin', cat: 'Specialty',   stock: 45,  unit: 'Bottle', price: 2200, min: 50  },
  { id: 6, name: 'Palm Oil 10L',           cat: 'Palm Oil',    stock: 180, unit: 'Tin',    price: 3200, min: 60  },
];

export const ORDERS = [
  { id: 'ORD-001', shop: 'Ali Traders',     man: 'Kamran', items: 3, total: 28500, status: 'delivered',  date: '2025-03-10', pay: 'installment' },
  { id: 'ORD-002', shop: 'Hassan Store',    man: 'Usman',  items: 2, total: 15200, status: 'processing', date: '2025-03-12', pay: 'full'        },
  { id: 'ORD-003', shop: 'Al-Barkat Store', man: 'Kamran', items: 5, total: 52000, status: 'pending',    date: '2025-03-14', pay: 'installment' },
  { id: 'ORD-004', shop: 'City Mart',       man: 'Zubair', items: 1, total: 9800,  status: 'delivered',  date: '2025-03-08', pay: 'full'        },
  { id: 'ORD-005', shop: 'Pak Kiryana',     man: 'Usman',  items: 4, total: 38400, status: 'cancelled',  date: '2025-03-05', pay: 'full'        },
  { id: 'ORD-006', shop: 'Al-Barkat Store', man: 'Zubair', items: 2, total: 21600, status: 'processing', date: '2025-03-15', pay: 'installment' },
];

export const PAYMENTS = [
  { id: 'PAY-001', shop: 'Ali Traders',     total: 28500, paid: 19000, type: 'installment', due: '2025-04-10', status: 'partial'  },
  { id: 'PAY-002', shop: 'Hassan Store',    total: 15200, paid: 15200, type: 'full',         due: null,         status: 'paid'     },
  { id: 'PAY-003', shop: 'Al-Barkat Store', total: 52000, paid: 17333, type: 'installment', due: '2025-03-20', status: 'overdue'  },
  { id: 'PAY-004', shop: 'City Mart',       total: 9800,  paid: 9800,  type: 'full',         due: null,         status: 'paid'     },
  { id: 'PAY-005', shop: 'Al-Barkat Store', total: 21600, paid: 0,     type: 'installment', due: '2025-04-01', status: 'pending'  },
];

export const COMPLAINTS = [
  { id: 'CMP-001', shop: 'Ali Traders',     product: 'Canola Oil 5L',    issue: 'Leaking bottles received',        type: 'damaged',  status: 'resolved',   date: '2025-03-08' },
  { id: 'CMP-002', shop: 'Hassan Store',    product: 'Dalda Banaspati',  issue: 'Wrong quantity delivered',         type: 'order',    status: 'pending',    date: '2025-03-11' },
  { id: 'CMP-003', shop: 'Al-Barkat Store', product: 'Sunflower Oil 1L', issue: 'Exchange request – expired batch', type: 'exchange', status: 'processing', date: '2025-03-13' },
  { id: 'CMP-004', shop: 'City Mart',       product: 'Sufi Cooking Oil', issue: 'Seal broken on arrival',           type: 'damaged',  status: 'pending',    date: '2025-03-15' },
];

export const CAMPAIGNS = [
  { id: 1, name: 'Ramadan Special', budget: 50000, spent: 38000, start: '2025-03-01', end: '2025-04-15', status: 'active',    roi: '18%' },
  { id: 2, name: 'Olive Oil Launch', budget: 30000, spent: 30000, start: '2025-02-01', end: '2025-02-28', status: 'completed', roi: '12%' },
  { id: 3, name: 'Summer Drive',     budget: 25000, spent: 0,     start: '2025-05-01', end: '2025-05-31', status: 'planned',   roi: '—'   },
];

export const SHOPKEEPERS = [
  { id: 1, name: 'Ali Traders',     owner: 'Muhammad Ali', loc: 'Lahore',     phone: '0300-1234567', status: 'active',   credit: 45000, total: 280000 },
  { id: 2, name: 'Hassan Store',    owner: 'Hassan Raza',  loc: 'Faisalabad', phone: '0301-2345678', status: 'active',   credit: 12000, total: 150000 },
  { id: 3, name: 'Pak Kiryana',     owner: 'Imran Khan',   loc: 'Multan',     phone: '0302-3456789', status: 'inactive', credit: 0,     total: 95000  },
  { id: 4, name: 'Al-Barkat Store', owner: 'Bilal Ahmed',  loc: 'Rawalpindi', phone: '0303-4567890', status: 'active',   credit: 78000, total: 420000 },
  { id: 5, name: 'City Mart',       owner: 'Farhan Malik', loc: 'Karachi',    phone: '0304-5678901', status: 'active',   credit: 23000, total: 190000 },
];

export const NOTIFICATIONS = [
  { id: 1, type: 'payment',   msg: 'Al-Barkat Store installment overdue – PKR 17,333',       date: 'Mar 15', read: false },
  { id: 2, type: 'order',     msg: 'New order ORD-006 placed by Al-Barkat Store',            date: 'Mar 15', read: false },
  { id: 3, type: 'stock',     msg: 'Canola Oil 5L below minimum (95 / 100 units)',           date: 'Mar 14', read: false },
  { id: 4, type: 'complaint', msg: 'New complaint from City Mart – broken seal',             date: 'Mar 15', read: true  },
  { id: 5, type: 'payment',   msg: 'Full payment received from Hassan Store – PKR 15,200',  date: 'Mar 12', read: true  },
  { id: 6, type: 'delivery',  msg: 'Order ORD-001 delivered to Ali Traders',                date: 'Mar 10', read: true  },
];

export const USERS = [
  { id: 1, name: 'Ahmad Raza',     email: 'admin@primeoil.com',  role: 'admin',      status: 'active' },
  { id: 2, name: 'Ali Traders',    email: 'ali@shop.com',        role: 'shopkeeper', status: 'active' },
  { id: 3, name: 'Kamran Saleem',  email: 'kamran@primeoil.com', role: 'salesman',   status: 'active' },
  { id: 4, name: 'Factory Direct', email: 'supply@factory.com',  role: 'supplier',   status: 'active' },
];

export const SALES_CHART = [
  { m: 'Oct', sales: 285, target: 300 },
  { m: 'Nov', sales: 320, target: 300 },
  { m: 'Dec', sales: 410, target: 350 },
  { m: 'Jan', sales: 380, target: 350 },
  { m: 'Feb', sales: 295, target: 320 },
  { m: 'Mar', sales: 445, target: 400 },
];

export const CATEGORY_CHART = [
  { name: 'Cooking Oil', v: 45 },
  { name: 'Banaspati',   v: 22 },
  { name: 'Palm Oil',    v: 18 },
  { name: 'Specialty',   v: 15 },
];

export const CASH_CHART = [
  { d: 'Mar 9',  i: 45000, o: 28000 },
  { d: 'Mar 10', i: 28500, o: 15000 },
  { d: 'Mar 11', i: 62000, o: 40000 },
  { d: 'Mar 12', i: 15200, o: 22000 },
  { d: 'Mar 13', i: 38000, o: 18000 },
  { d: 'Mar 14', i: 52000, o: 35000 },
  { d: 'Mar 15', i: 21600, o: 12000 },
];

export const PIE_COLORS = ['#D4880A', '#F5C842', '#B8860B', '#8B6508'];

export const QUICK_LOGINS = [
  { label: '👑 Admin',      role: 'admin',      email: 'admin@primeoil.com',  name: 'Ahmad Raza'    },
  { label: '🏪 Shopkeeper', role: 'shopkeeper', email: 'ali@shop.com',        name: 'Ali Traders'   },
  { label: '🚶 Salesman',   role: 'salesman',   email: 'kamran@primeoil.com', name: 'Kamran Saleem' },
  { label: '🏭 Supplier',   role: 'supplier',   email: 'supply@factory.com',  name: 'Factory Direct' },
];

export const NAV_ITEMS = [
  { id: 'overview',      label: 'Overview',      icon: '🏠' },
  { id: 'inventory',     label: 'Inventory',     icon: '📦' },
  { id: 'orders',        label: 'Orders',        icon: '🛒' },
  { id: 'payments',      label: 'Payments',      icon: '💳' },
  { id: 'cashflow',      label: 'Cash Flow',     icon: '💰' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'complaints',    label: 'Complaints',    icon: '💬' },
  { id: 'marketing',     label: 'Marketing',     icon: '📣' },
  { id: 'shopkeepers',   label: 'Shopkeepers',   icon: '👥' },
  { id: 'reports',       label: 'Reports',       icon: '📊' },
  { id: 'users',         label: 'User Mgmt',     icon: '⚙️' },
];

export const NAV_BY_ROLE = {
  admin:      ['overview','inventory','orders','payments','cashflow','notifications','complaints','marketing','shopkeepers','reports','users'],
  shopkeeper: ['overview','orders','payments','notifications','complaints'],
  salesman:   ['overview','orders','payments','inventory','notifications','shopkeepers'],
  supplier:   ['inventory','orders','notifications'],
};
