import React, { useMemo, useState } from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import SearchBar from '../components/SearchBar';
import { SkeletonTable } from '../components/common/Skeleton';
import { ApiError } from '../components/ApiMessage';
import { THead, TRow, TCell } from '../components/Table';
import { useFetch } from '../hooks/useFetch';
import { useVirtualScroll } from '../hooks/useVirtual';
import { useDebounce } from '../hooks/useDebounce';

import { api } from '../api/client';
import toast from 'react-hot-toast';

const STATUSES = ['all', 'pending', 'processing', 'delivered', 'cancelled'];
const STATUS_COLORS = [C.warn, C.info, C.success, C.danger];

export default function Orders({ role, user, onSendNotification, users = [] }) {
  const { data: orders, setData: setOrders, loading, error } = useFetch(() => api.getOrders(), []);
  const { data: shopkeepers, loading: shopsLoading } = useFetch(() => api.getShopkeepers(), []);
  const { data: products, loading: productsLoading } = useFetch(() => api.getProducts(), []);
  
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300); // Debounce search to improve rendering performance
  
  const [filter, setFilter] = useState('all');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [form, setForm] = useState({
    shop: '',
    man: '',
    items: '',
    total: '',
    pay: 'installment',
    status: 'pending',
  });

  const handleProductSelect = (product) => {
    const existing = selectedProducts.find(p => p.id === product.id);
    if (existing) {
      setSelectedProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
      ));
    } else {
      setSelectedProducts(prev => [...prev, { ...product, quantity: 1 }]);
    }
  };

  const handleProductQuantityChange = (productId, quantity) => {
    if (quantity <= 0) {
      setSelectedProducts(prev => prev.filter(p => p.id !== productId));
    } else {
      setSelectedProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, quantity } : p
      ));
    }
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const calculateOrderTotal = () => {
    return selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  };

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
    setSelectedProducts([]);
  };

  const baseOrders = useMemo(() => {
    if (role === 'supplier') return orders.filter(o => o.status !== 'cancelled');
    return orders;
  }, [orders, role]);

  // Filter orders based on debounced search and active status tab
  const filtered = useMemo(() => {
    return baseOrders.filter(o =>
      (filter === 'all' || o.status === filter) &&
      (o.shop.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
       o.id.toLowerCase().includes(debouncedSearch.toLowerCase()))
    );
  }, [baseOrders, filter, debouncedSearch]);

  // Virtualization parameters for orders table
  const rowHeight = 52;
  const viewportHeight = 400;
  const { visibleItems, totalHeight, startOffset, onScroll } = useVirtualScroll({
    items: filtered,
    rowHeight,
    viewportHeight
  });

  const startIndex = Math.max(0, Math.floor(startOffset / rowHeight));
  const bottomPadding = Math.max(0, totalHeight - startOffset - (visibleItems.length * rowHeight));

  const updateStatus = async (id, status) => {
    try {
      const updated = await api.updateOrder(id, { status });
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
      if (status === 'delivered') {
        onSendNotification?.({ type: 'delivery', msg: `Order ${id} delivered to ${updated.shop}` });
      }
    } catch {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    }
  };

  const createOrder = async () => {
    const shop = role === 'shopkeeper' ? (user?.name || '') : form.shop;
    const man = role === 'salesman' ? (user?.name || '').split(' ')[0] : form.man;
    const total = calculateOrderTotal();
    const itemCount = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
    
    if (!shop || !man || selectedProducts.length === 0 || total === 0) {
      toast.error('Please select at least one product and fill all required fields');
      return;
    }
    
    try {
      const newOrder = await api.createOrder({
        shop,
        man,
        items: itemCount,
        total: Math.round(total),
        status: form.status,
        pay: form.pay,
      });
      setOrders(prev => [newOrder, ...prev]); // Prepend new order
      onSendNotification?.({ type: 'order', msg: `New order ${newOrder.id} placed by ${shop}` });
      setShowNewOrder(false);
      initFormForRole();
    } catch (e) {
      console.error(e);
      toast.error('Failed to create order');
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
        onBtn={() => { initFormForRole(); setShowNewOrder(true); }}
      />

      {/* Filters bar */}
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
                background: filter === f ? C.goldBg : 'white',
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

      {/* Virtualized Table Container */}
      <div
        className="table-responsive-container"
        onScroll={onScroll}
        style={{
          maxHeight: `${viewportHeight}px`,
          overflowY: 'auto',
          borderRadius: 14,
          border: `1px solid ${C.border}`,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <caption className="sr-only">Orders register table</caption>
          <THead cols={['Order ID', 'Shopkeeper', 'Salesman', 'Items', 'Total', 'Payment', 'Status', 'Actions']} />
          <tbody>
            {/* Top virtual spacer */}
            {startOffset > 0 && (
              <tr style={{ height: `${startOffset}px` }}>
                <td colSpan={8} style={{ padding: 0 }} />
              </tr>
            )}

            {/* Virtualized Order Rows */}
            {visibleItems.length === 0 ? (
              <tr>
                <TCell colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>No orders found matching filters.</TCell>
              </tr>
            ) : (
              visibleItems.map(o => (
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
                        style={{ padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.text, background: 'white', cursor: 'pointer', outline: 'none' }}
                        aria-label={`Update status for order ${o.id}`}
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
                            style={{ padding: '5px 12px', background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 8, color: C.gold, fontSize: 11, cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s ease' }}
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
              ))
            )}

            {/* Bottom virtual spacer */}
            {bottomPadding > 0 && (
              <tr style={{ height: `${bottomPadding}px` }}>
                <td colSpan={8} style={{ padding: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary status metrics cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 16 }}>
        {['pending','processing','delivered','cancelled'].map((s, i) => (
          <div key={s} className="card-premium" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: STATUS_COLORS[i] }}>
              {baseOrders.filter(o => o.status === s).length}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s}</div>
          </div>
        ))}
      </div>

      {/* New order modal */}
      {showNewOrder && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(13, 42, 20, 0.45)',
              backdropFilter: 'blur(4px)',
              zIndex: 999
            }}
            onClick={() => setShowNewOrder(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            style={{
              position: 'fixed',
              top: '5%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              maxHeight: '90vh',
              overflow: 'auto',
              width: '90%',
              maxWidth: '850px',
              animation: 'slideUp 0.2s ease-out'
            }}
          >
            <div
              style={{
                background: C.card,
                borderRadius: 16,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-lg)',
                border: `1.5px solid ${C.goldBorder}`
              }}
            >
              <h2 id="modal-title" style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 18 }}>Place New Sales Order</h2>

              {/* Scrollable content area */}
              <div style={{ overflowY: 'auto', marginBottom: 20, paddingRight: 4 }}>
                {/* Basic info form */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: 18, paddingBottom: 16, borderBottom: `1.5px solid ${C.border}` }}>
                  <div>
                    <label htmlFor="order-shop" style={{ display: 'block', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>Shopkeeper</label>
                    {role === 'shopkeeper' ? (
                      <input id="order-shop" value={user?.name || ''} readOnly style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: '#f4f7f5', color: C.text, outline: 'none', fontSize: 13 }} />
                    ) : (
                      <select id="order-shop" value={form.shop} onChange={e => setForm({ ...form, shop: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: 'white', color: C.text, outline: 'none', fontSize: 13, cursor: 'pointer' }}>
                        <option value="">Select shop...</option>
                        {shopkeepers.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label htmlFor="order-man" style={{ display: 'block', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>Salesman</label>
                    {role === 'salesman' ? (
                      <input id="order-man" value={(user?.name || '').split(' ')[0]} readOnly style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: '#f4f7f5', color: C.text, outline: 'none', fontSize: 13 }} />
                    ) : (
                      <select id="order-man" value={form.man} onChange={e => setForm({ ...form, man: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: 'white', color: C.text, outline: 'none', fontSize: 13, cursor: 'pointer' }}>
                        <option value="">Select salesman...</option>
                        {salesmen.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label htmlFor="order-pay" style={{ display: 'block', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>Payment Method</label>
                    <select id="order-pay" value={form.pay} onChange={e => setForm({ ...form, pay: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: 'white', color: C.text, outline: 'none', fontSize: 13, cursor: 'pointer' }}>
                      {['full','installment'].map(p => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Product catalog selection */}
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                    Select Products Catalog
                    {selectedProducts.length > 0 && (
                      <span style={{ fontSize: 12, color: C.muted, fontWeight: 400, marginLeft: 8 }}>
                        ({selectedProducts.length} unique items selected)
                      </span>
                    )}
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                    {products.map(p => {
                      const isSelected = selectedProducts.some(sp => sp.id === p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleProductSelect(p)}
                          style={{
                            background: isSelected ? C.goldBg : C.card,
                            border: `2px solid ${isSelected ? C.gold : C.border}`,
                            borderRadius: 10,
                            padding: 12,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {p.imageUrl && (
                            <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, background: '#fcfcfc', borderRadius: 6 }}>
                              <img src={p.imageUrl} alt="" style={{ maxHeight: 70, maxWidth: '90%', objectFit: 'contain' }} />
                            </div>
                          )}
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2, lineHeight: 1.3 }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>{p.size || p.cat}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>PKR {p.price.toLocaleString()}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Products list details */}
                {selectedProducts.length > 0 && (
                  <div style={{ background: '#f4f7f5', border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Selected Items Details</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selectedProducts.map(p => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                          <div style={{ flex: 1, paddingRight: 10 }}>
                            <span style={{ fontWeight: 700, color: C.text }}>{p.name}</span>
                            <span style={{ color: C.muted, marginLeft: 8 }}>@ PKR {p.price.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => handleProductQuantityChange(p.id, p.quantity - 1)}
                              style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}
                              aria-label={`Decrease quantity of ${p.name}`}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={p.quantity}
                              onChange={e => handleProductQuantityChange(p.id, parseInt(e.target.value) || 1)}
                              style={{ width: 44, padding: '3px', border: `1px solid ${C.border}`, borderRadius: 6, background: 'white', textAlign: 'center', fontSize: 12, outline: 'none' }}
                              aria-label={`Quantity of ${p.name}`}
                            />
                            <button
                              onClick={() => handleProductQuantityChange(p.id, p.quantity + 1)}
                              style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}
                              aria-label={`Increase quantity of ${p.name}`}
                            >
                              +
                            </button>
                            <button
                              onClick={() => handleRemoveProduct(p.id)}
                              style={{ padding: '4px 8px', border: `1px solid ${C.danger}33`, borderRadius: 6, background: 'white', color: C.danger, cursor: 'pointer', fontSize: 11, fontWeight: 700, marginLeft: 8 }}
                            >
                              Remove
                            </button>
                          </div>
                          <div style={{ textAlign: 'right', minWidth: 90, fontWeight: 700, color: C.gold }}>
                            PKR {(p.price * p.quantity).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, color: C.text }}>Grand Order Total:</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.gold }}>
                        PKR {calculateOrderTotal().toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', gap: 12, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                <button
                  onClick={createOrder}
                  disabled={selectedProducts.length === 0}
                  style={{
                    flex: 1,
                    padding: '11px',
                    background: selectedProducts.length === 0 ? '#cccccc' : C.gold,
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    cursor: selectedProducts.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: 13,
                    transition: 'all 0.15s ease'
                  }}
                >
                  ✓ Submit Sales Order
                </button>
                <button
                  onClick={() => {
                    setShowNewOrder(false);
                    initFormForRole();
                  }}
                  style={{
                    flex: 1,
                    padding: '11px',
                    background: 'transparent',
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 8,
                    color: C.muted,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                    transition: 'all 0.15s ease'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
