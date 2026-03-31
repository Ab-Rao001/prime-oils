import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import C from '../theme';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { THead, TRow, TCell } from '../components/Table';
import { ORDERS, PAYMENTS, COMPLAINTS, PRODUCTS, SALES_CHART, CATEGORY_CHART, PIE_COLORS } from '../data/mockData';

export default function Overview({ role, user, onNavigate }) {
  const firstName = String(user?.name || '').split(' ')[0].trim();

  const myOrders = (() => {
    if (role === 'shopkeeper') return ORDERS.filter(o => o.shop === user?.name);
    if (role === 'salesman') return ORDERS.filter(o => o.man === firstName);
    if (role === 'admin') return ORDERS;
    return ORDERS;
  })();

  const shopsSet = new Set(myOrders.map(o => o.shop));

  const myPayments = (() => {
    if (role === 'admin') return PAYMENTS;
    if (role === 'shopkeeper') return PAYMENTS.filter(p => p.shop === user?.name);
    if (role === 'salesman') return PAYMENTS.filter(p => shopsSet.has(p.shop));
    return PAYMENTS;
  })();

  const myComplaints = (() => {
    if (role === 'admin') return COMPLAINTS;
    if (role === 'shopkeeper') return COMPLAINTS.filter(c => c.shop === user?.name);
    return [];
  })();

  const totalOrders = myOrders.length;
  const processingOrders = myOrders.filter(o => o.status === 'processing').length;

  const revenuePaid = myPayments.reduce((a, p) => a + (p.paid || 0), 0);
  const revenuePending = myPayments.reduce((a, p) => a + Math.max(0, (p.total || 0) - (p.paid || 0)), 0);

  const lowStockCount = PRODUCTS.filter(p => p.stock < p.min).length;

  const openComplaints = myComplaints.filter(c => c.status === 'pending' || c.status === 'processing').length;

  const fmtK = n => `PKR ${(n / 1000).toFixed(0)}K`;

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: C.text, margin: 0 }}>Dashboard Overview</h1>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>
          Welcome back. Here's what's happening today — March 15, 2025
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('orders')}>
          <StatCard icon="🛒" label="Total Orders" value={String(totalOrders)} sub={`${processingOrders} processing`} />
        </div>

        {(role === 'admin' || role === 'salesman' || role === 'shopkeeper') && (
          <div
            style={{ cursor: 'pointer' }}
            onClick={() => onNavigate?.(role === 'admin' ? 'cashflow' : 'payments')}
          >
            <StatCard
              icon="💰"
              label="Revenue (Collected)"
              value={fmtK(revenuePaid)}
              sub={myPayments.length ? `${myPayments.filter(p => (p.total - p.paid) > 0).length} pending` : '—'}
              color={C.success}
            />
          </div>
        )}

        <div style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('payments')}>
          <StatCard icon="⏳" label="Pending Payments" value={fmtK(revenuePending)} sub={`${myPayments.length} accounts`} color={C.warn} />
        </div>

        {role !== 'shopkeeper' && (
          <div style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('inventory')}>
            <StatCard icon="📦" label="Products" value={`${PRODUCTS.length} items`} sub={`${lowStockCount} low stock`} color={C.info} />
          </div>
        )}

        {role === 'admin' && (
          <div style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('shopkeepers')}>
            <StatCard icon="👥" label="Active Shopkeepers" value="4 / 5" color={C.gold} />
          </div>
        )}

        {(role === 'admin' || role === 'shopkeeper') && (
          <div style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('complaints')}>
            <StatCard icon="⚠️" label="Open Complaints" value={String(openComplaints)} sub="pending/processing" color={C.danger} />
          </div>
        )}
      </div>

      {/* Charts only for admin */}
      {role === 'admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 14, marginBottom: 14 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>Sales vs Target (PKR 000s)</div>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={SALES_CHART} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} />
                <Tooltip formatter={(v, n) => [`PKR ${v}K`, n]} />
                <Bar dataKey="sales"  fill={C.gold}   radius={[4,4,0,0]} name="Sales"  />
                <Bar dataKey="target" fill="#E6DECE" radius={[4,4,0,0]} name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>Sales by Category</div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={CATEGORY_CHART} dataKey="v" nameKey="name" cx="50%" cy="50%" outerRadius={65} paddingAngle={3}>
                  {CATEGORY_CHART.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v}%`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 6 }}>
              {CATEGORY_CHART.map((d, i) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.muted }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i], flexShrink: 0 }} />
                  {d.name} ({d.v}%)
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent orders table */}
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
                  <TCell bold>PKR {o.total.toLocaleString()}</TCell>
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
