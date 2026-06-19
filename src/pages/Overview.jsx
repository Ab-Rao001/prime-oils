import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import C from '../theme';
import StatCard from '../components/StatCard';
import ProductCard from '../components/ProductCard';
import Badge from '../components/Badge';
import PageLoader from '../components/PageLoader';
import { ApiError } from '../components/ApiMessage';
import { THead, TRow, TCell } from '../components/Table';
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

  const firstName = String(user?.name || '').split(' ')[0].trim();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const myOrders = useMemo(() => {
    if (role === 'shopkeeper') return orders.filter(o => o.shop === user?.name);
    if (role === 'salesman') return orders.filter(o => o.man === firstName);
    return orders;
  }, [orders, role, user, firstName]);

  const shopsSet = useMemo(() => new Set(myOrders.map(o => o.shop)), [myOrders]);

  const myPayments = useMemo(() => {
    if (role === 'shopkeeper') return payments.filter(p => p.shop === user?.name);
    if (role === 'salesman') return payments.filter(p => shopsSet.has(p.shop));
    return payments;
  }, [payments, role, user, shopsSet]);

  const myComplaints = useMemo(() => {
    if (role === 'shopkeeper') return complaints.filter(c => c.shop === user?.name);
    if (role === 'admin') return complaints;
    return [];
  }, [complaints, role, user]);

  const catalogProducts = useMemo(() => sortProductsBySize(products), [products]);
  const activeShops = shopkeepers.filter(s => s.status === 'active').length;

  const totalOrders = myOrders.length;
  const processingOrders = myOrders.filter(o => o.status === 'processing').length;
  const revenuePaid = myPayments.reduce((a, p) => a + (p.paid || 0), 0);
  const revenuePending = myPayments.reduce((a, p) => a + Math.max(0, (p.total || 0) - (p.paid || 0)), 0);
  const lowStockCount = products.filter(p => p.stock < p.min).length;
  const openComplaints = myComplaints.filter(c => c.status === 'pending' || c.status === 'processing').length;
  const fmtK = n => `PKR ${(n / 1000).toFixed(0)}K`;

  if (loading) return <PageLoader label="Loading dashboard..." />;

  return (
    <div className="page-enter">
      <ApiError error={error} />
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: C.text, margin: 0 }}>Dashboard Overview</h1>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>Welcome back — {today}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('orders')}>
          <StatCard icon="🛒" label="Total Orders" value={String(totalOrders)} sub={`${processingOrders} processing`} />
        </div>

        {(role === 'admin' || role === 'salesman' || role === 'shopkeeper') && (
          <div style={{ cursor: 'pointer' }} onClick={() => onNavigate?.(role === 'admin' ? 'cashflow' : 'payments')}>
            <StatCard icon="💰" label="Revenue (Collected)" value={fmtK(revenuePaid)} sub={`${myPayments.length} accounts`} color={C.success} />
          </div>
        )}

        <div style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('payments')}>
          <StatCard icon="⏳" label="Pending Payments" value={fmtK(revenuePending)} color={C.warn} />
        </div>

        {role !== 'shopkeeper' && (
          <div style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('inventory')}>
            <StatCard icon="📦" label="Products" value={`${products.length} items`} sub={`${lowStockCount} low stock`} color={C.info} />
          </div>
        )}

        {role === 'admin' && (
          <div style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('shopkeepers')}>
            <StatCard icon="👥" label="Active Shopkeepers" value={`${activeShops} / ${shopkeepers.length}`} color={C.gold} />
          </div>
        )}

        {(role === 'admin' || role === 'shopkeeper') && (
          <div style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('complaints')}>
            <StatCard icon="⚠️" label="Open Complaints" value={String(openComplaints)} color={C.danger} />
          </div>
        )}
      </div>

      {role === 'admin' && salesChart.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 14, marginBottom: 14 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>Sales vs Target (PKR 000s)</div>
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
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>Sales by Category</div>
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
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Product catalog &amp; prices</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {catalogProducts.map(p => (
              <ProductCard key={p._id || p.id} product={p} showStock={role !== 'shopkeeper'} />
            ))}
          </div>
        </div>
      )}

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 600, color: C.text }}>
          Recent Orders
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <THead cols={['Order ID', 'Shopkeeper', 'Total', 'Status', 'Date']} />
            <tbody>
              {myOrders.slice(0, 4).map(o => (
                <TRow key={o.id}>
                  <TCell bold>{o.id}</TCell>
                  <TCell>{o.shop}</TCell>
                  <TCell bold>PKR {(o.total || 0).toLocaleString()}</TCell>
                  <TCell><Badge s={o.status} /></TCell>
                  <TCell>{o.date}</TCell>
                </TRow>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
