import React, { useMemo, useState } from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import SearchBar from '../components/SearchBar';
import { SkeletonTable } from '../components/common/Skeleton';
import { ApiError } from '../components/ApiMessage';
import Table, { TRow, TCell } from '../components/Table';
import { useFetch } from '../hooks/useFetch';
import { useVirtualScroll } from '../hooks/useVirtual';
import { useDebounce } from '../hooks/useDebounce';

import { orderApi } from '../api/orderApi';
import { userApi } from '../api/userApi';
import { inventoryApi } from '../api/inventoryApi';
import { paymentApi } from '../api/paymentApi';
import toast from 'react-hot-toast';

import NewOrderModal from '../components/orders/NewOrderModal';
import SupplierOrderModal from '../components/orders/SupplierOrderModal';
import EmptyState from '../components/common/EmptyState';

const STATUSES = ['all', 'pending', 'confirmed', 'delivered', 'cancelled'];
const STATUS_COLORS = [C.warn, C.info, C.success, C.danger];

export default function Orders({ role, user, onSendNotification, users = [] }) {
  const { data: orders, setData: setOrders, loading, error } = useFetch(() => orderApi.getOrders(), []);
  const { data: shopkeepers, loading: shopsLoading } = useFetch(() => userApi.getShopkeepers(), []);
  const { data: products, loading: productsLoading } = useFetch(() => inventoryApi.getProducts(), []);
  const { data: dbSalesmen } = useFetch(() => userApi.getSalesmen(), []);
  
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  
  const [filter, setFilter] = useState('all');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [supplierReviewOrder, setSupplierReviewOrder] = useState(null);

  const salesmen = useMemo(() => {
    const fromOrders = orders.map(o => o.man).filter(Boolean);
    const fromUsers = (users || []).filter(u => u.role === 'salesman').map(u => u.name).filter(Boolean);
    const fromDb = (dbSalesmen || []).map(u => u.name).filter(Boolean);
    return Array.from(new Set([...fromOrders, ...fromUsers, ...fromDb].filter(Boolean)));
  }, [orders, users, dbSalesmen]);

  const canCreateOrder = role === 'admin' || role === 'shopkeeper' || role === 'salesman';

  const baseOrders = useMemo(() => {
    if (role === 'supplier') return orders.filter(o => o.status !== 'cancelled');
    return orders;
  }, [orders, role]);

  const filtered = useMemo(() => {
    return baseOrders.filter(o =>
      (filter === 'all' || o.status === filter) &&
      (o.shop.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
       o.id.toLowerCase().includes(debouncedSearch.toLowerCase()))
    );
  }, [baseOrders, filter, debouncedSearch]);

  const rowHeight = 52;
  const viewportHeight = 400;
  const { visibleItems, totalHeight, startOffset, onScroll } = useVirtualScroll({
    items: filtered,
    rowHeight,
    viewportHeight
  });

  const startIndex = Math.max(0, Math.floor(startOffset / rowHeight));
  const bottomPadding = Math.max(0, totalHeight - startOffset - (visibleItems.length * rowHeight));

  const updateStatus = async (id, status, reason) => {
    try {
      const updated = await orderApi.updateOrderStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
      if (status === 'delivered') {
        onSendNotification?.({ type: 'delivery', msg: `Order ${id} delivered to ${updated.shop}` });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update order status');
      // Force refresh data to revert optimistic UI
      orderApi.getOrders().then(setOrders);
    }
  };

  if (loading || shopsLoading || productsLoading) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SectionHeader title="Order Management" />
        <SkeletonTable rows={5} cols={8} />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <ApiError error={error} />
      <SectionHeader
        title="Order Management"
        btn={canCreateOrder ? 'New Order' : null}
        onBtn={() => setShowNewOrder(true)}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="tablist" aria-label="Filter orders by status">
          {STATUSES.map(f => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                border: `1.5px solid ${filter === f ? C.gold : C.border}`,
                borderRadius: 20,
                background: filter === f ? C.goldBg : C.card,
                color: filter === f ? C.gold : C.muted,
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: filter === f ? 600 : 500,
                textTransform: 'capitalize',
                transition: 'all 0.15s ease',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search orders by ID or shop..." />
        </div>
      </div>

      <Table
        headers={['Date', 'Order ID', 'Shop', 'Salesman', 'Items', 'Total', 'Payment', 'Status', 'Actions']}
        data={visibleItems}
        onScroll={onScroll}
        style={{ maxHeight: `${viewportHeight}px`, overflowY: 'auto' }}
        virtualPadding={{ top: startOffset, bottom: bottomPadding }}
        emptyMessage="There are no orders matching your current filters."
        caption="Orders register table"
        renderRow={(o) => (
          <TRow key={o.id}>
            <TCell>{new Date(o.date).toLocaleDateString()}</TCell>
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
                  style={{ padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.text, background: C.bg, cursor: 'pointer', outline: 'none' }}
                  aria-label={`Update status for order ${o.id}`}
                >
                  {['pending','confirmed','delivered','cancelled'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              )}

              {role === 'supplier' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {['pending', 'pending_approval', 'paid'].includes(o.status) && (
                    <button
                      onClick={() => setSupplierReviewOrder(o)}
                      style={{ padding: '5px 12px', background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 8, color: C.gold, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                    >
                      Review
                    </button>
                  )}
                  {['confirmed', 'paid'].includes(o.status) && (
                    <button
                      onClick={() => updateStatus(o.id, 'ready_for_dispatch')}
                      style={{ padding: '5px 12px', background: C.success, border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                    >
                      Prepare
                    </button>
                  )}
                  {o.status === 'ready_for_dispatch' && (
                    <span style={{ fontSize: 11, color: C.success, fontWeight: 700 }}>Prepared</span>
                  )}
                </div>
              )}

              {(role !== 'admin' && role !== 'supplier' && role !== 'salesman') && (
                o.status !== 'cancelled' ? (
                  <button
                    onClick={() => { setPayModal(o); setPayAmount(o.total.toString()); }}
                    style={{ padding: '5px 12px', background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 8, color: C.gold, fontSize: 11, cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s ease' }}
                  >
                    Pay
                  </button>
                ) : (
                  <span style={{ color: C.muted, fontSize: 12 }}>—</span>
                )
              )}
            </td>
          </TRow>
        )}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 16 }}>
        {['pending','confirmed','delivered','cancelled'].map((s, i) => (
          <div key={s} className="card-premium" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: STATUS_COLORS[i] }}>
              {baseOrders.filter(o => o.status === s).length}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s}</div>
          </div>
        ))}
      </div>

      <NewOrderModal
        show={showNewOrder}
        onClose={() => setShowNewOrder(false)}
        role={role}
        user={user}
        shopkeepers={shopkeepers}
        salesmen={salesmen}
        products={products}
        onSendNotification={onSendNotification}
        onOrderCreated={(newOrder) => setOrders(prev => [newOrder, ...prev])}
      />

      {supplierReviewOrder && (
        <SupplierOrderModal
          order={supplierReviewOrder}
          shopkeeper={shopkeepers.find(s => s.name === supplierReviewOrder.shop) || null}
          onClose={() => setSupplierReviewOrder(null)}
          onStatusChange={updateStatus}
        />
      )}

      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: 24, width: 320 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Pay Order {payModal.id}</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Total: PKR {payModal.total.toLocaleString()}</div>
            <input
              type="number"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              placeholder="Amount (PKR)"
              style={{ width: '100%', padding: 10, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 12, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={async () => {
                if (!payAmount || Number(payAmount) <= 0) {
                  toast.error('Enter a valid amount');
                  return;
                }
                try {
                  await paymentApi.payOrder({ orderId: payModal.id, amount: Number(payAmount) });
                  toast.success('Payment recorded successfully');
                  onSendNotification?.({ type: 'payment', msg: `Payment of PKR ${payAmount} recorded for order ${payModal.id}` });
                } catch (e) {
                  toast.error(e.message || 'Failed to record payment');
                }
                setPayModal(null);
                setPayAmount('');
              }} style={{ flex: 1, padding: 10, background: C.gold, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Pay</button>
              <button onClick={() => { setPayModal(null); setPayAmount(''); }} style={{ flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 8, background: 'transparent', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
