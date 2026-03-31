import React, { useMemo, useState } from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import SearchBar from '../components/SearchBar';
import { THead, TRow, TCell } from '../components/Table';
import { ORDERS, SHOPKEEPERS } from '../data/mockData';

const STATUSES = ['all', 'pending', 'processing', 'delivered', 'cancelled'];
const STATUS_COLORS = [C.warn, C.info, C.success, C.danger];

export default function Orders({ role, user, onSendNotification, users = [] }) {
  const [orders, setOrders] = useState(ORDERS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [form, setForm] = useState({
    shop: '',
    man: '',
    items: '',
    total: '',
    pay: 'installment',
    status: 'pending',
  });

  const firstName = String(user?.name || '').split(' ')[0].trim();

  const salesmen = useMemo(() => {
    const fromOrders = orders.map(o => o.man).filter(Boolean);
    const fromUsers = (users || []).filter(u => u.role === 'salesman').map(u => String(u.name || '').split(' ')[0]).filter(Boolean);
    return Array.from(new Set([...fromOrders, ...fromUsers].filter(Boolean)));
  }, [orders, users]);

  const canCreateOrder = role === 'admin' || role === 'shopkeeper' || role === 'salesman';

  const initFormForRole = () => {
    const shop = role === 'shopkeeper' ? (user?.name || '') : '';
    const man = role === 'salesman' ? (user?.name || '').split(' ')[0] : '';
    setForm(prev => ({ ...prev, shop, man, items: '', total: '', pay: 'installment', status: 'pending' }));
  };

  const baseOrders = useMemo(() => {
    if (role === 'shopkeeper') return orders.filter(o => o.shop === user?.name);
    if (role === 'salesman') return orders.filter(o => o.man === firstName);
    if (role === 'supplier') return orders.filter(o => o.status !== 'cancelled');
    return orders;
  }, [orders, role, user, firstName]);

  const filtered = baseOrders.filter(o =>
    (filter === 'all' || o.status === filter) &&
    (o.shop.toLowerCase().includes(search.toLowerCase()) ||
     o.id.toLowerCase().includes(search.toLowerCase()))
  );

  const updateStatus = (id, status) =>
    setOrders(orders.map(o => o.id === id ? { ...o, status } : o));

  const createOrder = () => {
    if (!form.shop || !form.man || !form.items || !form.total) return;
    const maxNum = Math.max(0, ...orders.map(o => Number(String(o.id).replace(/\D/g, '')) || 0));
    const id = `ORD-${String(maxNum + 1).padStart(3, '0')}`;
    const date = new Date().toISOString().slice(0, 10);
    const newOrder = {
      id,
      shop: form.shop,
      man: form.man,
      items: +form.items,
      total: +form.total,
      status: form.status,
      date,
      pay: form.pay,
    };
    setOrders(prev => [...prev, newOrder]);
    onSendNotification?.({ type: 'order', msg: `New order ${id} placed by ${form.shop}` });
    setShowNewOrder(false);
    initFormForRole();
  };

  return (
    <div className="page-enter">
      <SectionHeader
        title="Order Management"
        btn={canCreateOrder ? 'New Order' : null}
        onBtn={() => { initFormForRole(); setShowNewOrder(true); }}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUSES.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 12px',
              border: `1px solid ${filter === f ? C.gold : C.border}`,
              borderRadius: 20,
              background: filter === f ? C.goldBg : 'transparent',
              color: filter === f ? C.gold : C.muted,
              fontSize: 12, cursor: 'pointer',
              fontWeight: filter === f ? 600 : 400,
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search orders..." />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <THead cols={['Order ID', 'Shopkeeper', 'Salesman', 'Items', 'Total', 'Payment', 'Status', 'Update']} />
          <tbody>
            {filtered.map(o => (
              <TRow key={o.id}>
                <TCell bold>{o.id}</TCell>
                <TCell>{o.shop}</TCell>
                <TCell>{o.man}</TCell>
                <TCell>{o.items}</TCell>
                <TCell bold>PKR {o.total.toLocaleString()}</TCell>
                <TCell><Badge s={o.pay} /></TCell>
                <TCell><Badge s={o.status} /></TCell>
                <td style={{ padding: '8px 12px' }}>
                  {role === 'admin' && (
                    <select
                      value={o.status}
                      onChange={e => updateStatus(o.id, e.target.value)}
                      style={{ padding: '4px 7px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, color: C.text, background: C.bg, cursor: 'pointer' }}
                    >
                      {['pending','processing','delivered','cancelled'].map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  )}

                  {role === 'supplier' && (
                    <>
                      {o.status === 'pending' ? (
                        <button
                          onClick={() => {
                            updateStatus(o.id, 'delivered');
                            onSendNotification?.({ type: 'delivery', msg: `Order ${o.id} delivered to ${o.shop}` });
                          }}
                          style={{ padding: '4px 10px', background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 6, color: C.gold, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                        >
                          Deliver
                        </button>
                      ) : (
                        <span style={{ color: C.muted, fontSize: 12 }}>—</span>
                      )}
                    </>
                  )}

                  {(role !== 'admin' && role !== 'supplier') && (
                    <span style={{ color: C.muted, fontSize: 12 }}>—</span>
                  )}
                </td>
              </TRow>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
        {['pending','processing','delivered','cancelled'].map((s, i) => (
          <div key={s} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: STATUS_COLORS[i] }}>
              {baseOrders.filter(o => o.status === s).length}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, textTransform: 'capitalize' }}>{s}</div>
          </div>
        ))}
      </div>

      {/* New order modal */}
      {showNewOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.card, borderRadius: 16, padding: 26, width: 460, boxShadow: '0 20px 50px rgba(0,0,0,0.15)', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 16 }}>Create Order</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Shopkeeper</label>
                {role === 'shopkeeper' ? (
                  <input
                    value={user?.name || ''}
                    readOnly
                    style={{ width: '100%', padding: '9px 11px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}
                  />
                ) : (
                  <select
                    value={form.shop}
                    onChange={e => setForm({ ...form, shop: e.target.value })}
                    style={{ width: '100%', padding: '9px 11px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}
                  >
                    <option value="">Select shop...</option>
                    {SHOPKEEPERS.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Salesman</label>
                {role === 'salesman' ? (
                  <input
                    value={(user?.name || '').split(' ')[0]}
                    readOnly
                    style={{ width: '100%', padding: '9px 11px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}
                  />
                ) : (
                  <select
                    value={form.man}
                    onChange={e => setForm({ ...form, man: e.target.value })}
                    style={{ width: '100%', padding: '9px 11px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}
                  >
                    <option value="">Select salesman...</option>
                    {salesmen.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Items</label>
                <input
                  type="number"
                  value={form.items}
                  onChange={e => setForm({ ...form, items: e.target.value })}
                  style={{ width: '100%', padding: '9px 11px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Total (PKR)</label>
                <input
                  type="number"
                  value={form.total}
                  onChange={e => setForm({ ...form, total: e.target.value })}
                  style={{ width: '100%', padding: '9px 11px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Payment</label>
                <select
                  value={form.pay}
                  onChange={e => setForm({ ...form, pay: e.target.value })}
                  style={{ width: '100%', padding: '9px 11px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none' }}
                >
                  {['full','installment'].map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={createOrder}
                style={{ flex: 1, padding: '10px 12px', background: C.gold, border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer', fontWeight: 800 }}
              >
                Create
              </button>
              <button
                onClick={() => setShowNewOrder(false)}
                style={{ flex: 1, padding: '10px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, cursor: 'pointer', fontWeight: 700 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
