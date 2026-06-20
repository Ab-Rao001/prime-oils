import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import C from '../theme';
import StatCard from '../components/StatCard';
import ProductCard from '../components/ProductCard';
import { Badge, Typography } from '../components/ui';
import PageLoader from '../components/PageLoader';
import { ApiError } from '../components/ApiMessage';
import DataGrid from '../components/DataGrid';
import { PIE_COLORS } from '../config/charts';
import { sortProductsBySize } from '../config/products';
import { useFetch } from '../hooks/useFetch';
import { orderApi } from '../api/orderApi';
import { paymentApi } from '../api/paymentApi';
import { userApi } from '../api/userApi';
import { inventoryApi } from '../api/inventoryApi';
import { analyticsApi } from '../api/analyticsApi';

export default function Overview({ role, user, onNavigate }) {
  const { data: orders, loading: oLoad, error: oErr } = useFetch(() => orderApi.getOrders(), []);
  const { data: payments, loading: pLoad } = useFetch(() => paymentApi.getPayments(), []);
  const { data: complaints, loading: cLoad } = useFetch(() => userApi.getComplaints(), []);
  const { data: products, loading: prLoad } = useFetch(() => inventoryApi.getProducts(), []);
  const { data: shopkeepers } = useFetch(() => userApi.getShopkeepers(), []);
  const { data: salesChart } = useFetch(() => analyticsApi.getChart('sales'), []);
  const { data: categoryChart } = useFetch(() => analyticsApi.getChart('category'), []);

  const loading = oLoad || pLoad || cLoad || prLoad;
  const error = oErr;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // NOTE: The backend API already scopes orders/payments/complaints per role.
  // No client-side filtering needed — using the data directly avoids
  // broken comparisons between shop display names and usernames.
  const myOrders = useMemo(() => orders, [orders]);
  const myPayments = useMemo(() => payments, [payments]);
  const myComplaints = useMemo(() => complaints, [complaints]);

  const catalogProducts = useMemo(() => sortProductsBySize(products), [products]);
  const activeShops = shopkeepers.filter(s => s.status === 'active').length;

  const totalOrders = myOrders.length;
  const processingOrders = myOrders.filter(o => o.status === 'processing').length;
  const revenuePaid = myPayments.reduce((a, p) => a + (p.paid || 0), 0);
  
  const todayDateString = new Date().toISOString().slice(0, 10);
  const dailyCollection = myPayments
      .filter(p => p.updatedAt?.startsWith(todayDateString) && p.paid > 0)
      .reduce((a, p) => a + (p.paid || 0), 0);

  const revenuePending = myPayments.reduce((a, p) => a + Math.max(0, (p.total || 0) - (p.paid || 0)), 0);
  const lowStockCount = products.filter(p => p.stock < p.min).length;
  const openComplaints = myComplaints.filter(c => c.status === 'pending' || c.status === 'processing').length;
  const fmtK = n => `PKR ${(n / 1000).toFixed(0)}K`;

  const recentOrdersColumns = useMemo(() => [
    { header: 'Order ID', accessorKey: 'id', cell: (o) => <Typography variant="body" weight="semibold">{o.id}</Typography> },
    { header: 'Shopkeeper', accessorKey: 'shop' },
    { header: 'Total', accessorKey: 'total', cell: (o) => <Typography variant="body" weight="semibold">PKR {(o.total || 0).toLocaleString()}</Typography> },
    { header: 'Status', accessorKey: 'status', cell: (o) => <Badge variant={['pending', 'pending_approval'].includes(o.status) ? 'warning' : o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : 'default'}>{o.status}</Badge> },
    { header: 'Date', accessorKey: 'date' }
  ], []);

  if (loading) return <PageLoader label="Loading dashboard..." />;

  return (
    <div className="page-enter">
      <ApiError error={error} />
      <div className="mb-5">
        <Typography variant="h1" className="m-0 text-foreground">Dashboard Overview</Typography>
        <Typography variant="body" className="text-muted-foreground mt-1 text-[13px]">Welcome back — {today}</Typography>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3 mb-5">
        <div className="cursor-pointer" onClick={() => onNavigate?.('orders')}>
          <StatCard icon="🛒" label="Total Orders" value={String(totalOrders)} sub={`${processingOrders} processing`} colorClass="text-gold bg-gold/15" />
        </div>

        {(role === 'admin' || role === 'salesman' || role === 'shopkeeper') && (
          <div className="cursor-pointer" onClick={() => onNavigate?.(role === 'admin' ? 'cashflow' : 'payments')}>
            <StatCard icon="💰" label={role === 'shopkeeper' ? 'Total Paid' : 'Revenue (Collected)'} value={fmtK(revenuePaid)} sub={role === 'shopkeeper' ? `${myPayments.length} payments` : `${myPayments.length} accounts`} colorClass="text-success bg-success/15" />
          </div>
        )}

        {role === 'salesman' && (
          <div className="cursor-pointer" onClick={() => onNavigate?.('payments')}>
            <StatCard icon="📅" label="Daily Collection" value={fmtK(dailyCollection)} colorClass="text-info bg-info/15" />
          </div>
        )}

        <div className="cursor-pointer" onClick={() => onNavigate?.('payments')}>
          <StatCard icon="⏳" label={role === 'salesman' ? "Amount Due in Market" : "Pending Payments"} value={fmtK(revenuePending)} colorClass="text-warn bg-warn/15" />
        </div>

        {role !== 'shopkeeper' && (
          <div className="cursor-pointer" onClick={() => onNavigate?.('inventory')}>
            <StatCard icon="📦" label="Products" value={`${products.length} items`} sub={`${lowStockCount} low stock`} colorClass="text-info bg-info/15" />
          </div>
        )}

        {role === 'admin' && (
          <div className="cursor-pointer" onClick={() => onNavigate?.('shopkeepers')}>
            <StatCard icon="👥" label="Active Shopkeepers" value={`${activeShops} / ${shopkeepers.length}`} colorClass="text-gold bg-gold/15" />
          </div>
        )}

        {(role === 'admin' || role === 'shopkeeper') && (
          <div className="cursor-pointer" onClick={() => onNavigate?.('complaints')}>
            <StatCard icon="⚠️" label="Open Complaints" value={String(openComplaints)} colorClass="text-danger bg-danger/15" />
          </div>
        )}
      </div>

      {role === 'admin' && salesChart.length > 0 && (
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3.5 mb-3.5 max-lg:grid-cols-1">
          <div className="bg-card border border-border dark:border-border-dark rounded-xl p-4.5">
            <Typography variant="body" weight="semibold" className="mb-3.5 block text-foreground">Sales vs Target (PKR 000s)</Typography>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={salesChart} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} />
                <Tooltip formatter={(v, n) => [`PKR ${v}K`, n]} />
                <Bar dataKey="sales" fill={C.gold} radius={[4, 4, 0, 0]} name="Sales" />
                <Bar dataKey="target" fill="#E6DECE" radius={[4, 4, 0, 0]} name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {categoryChart.length > 0 && (
            <div className="bg-card border border-border dark:border-border-dark rounded-xl p-4.5">
              <Typography variant="body" weight="semibold" className="mb-3.5 block text-foreground">Sales by Category</Typography>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={categoryChart} dataKey="v" nameKey="name" cx="50%" cy="50%" outerRadius={65} paddingAngle={3}>
                    {categoryChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {catalogProducts.length > 0 && (
        <div className="mb-4.5">
          <Typography variant="body" weight="semibold" className="mb-3 block text-foreground">Product catalog &amp; prices</Typography>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {catalogProducts.map(p => (
              <ProductCard key={p._id || p.id} product={p} showStock={role !== 'shopkeeper'} />
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border dark:border-border-dark rounded-xl overflow-hidden">
        <div className="py-3.5 px-4.5 border-b border-border dark:border-border-dark text-sm font-semibold text-foreground">
          Recent Orders
        </div>
        <DataGrid 
          columns={recentOrdersColumns}
          data={myOrders.slice(0, 4)}
          selectable={false}
        />
      </div>
    </div>
  );
}
