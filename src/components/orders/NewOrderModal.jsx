import React, { useState, useEffect } from 'react';
import C from '../../theme';
import { orderApi } from '../../api/orderApi';
import toast from 'react-hot-toast';

const NewOrderModal = React.memo(({ show, onClose, role, user, shopkeepers = [], salesmen = [], products = [], onOrderCreated, onSendNotification }) => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [form, setForm] = useState({
    shop: '',
    man: '',
    items: '',
    total: '',
    pay: 'installment',
    status: 'pending',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
        const shop = role === 'shopkeeper' ? (user?.name || '') : '';
        const man = role === 'salesman' ? (user?.name || '') : '';
        setForm({ shop, man, items: '', total: '', pay: 'installment', status: 'pending' });
        setSelectedProducts([]);
        
        const handleEscape = (e) => {
          if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [show, role, user, onClose]);

  if (!show) return null;

  const handleProductSelect = (product) => {
    const existing = selectedProducts.find(p => p.id === product.id);
    if (existing) {
      setSelectedProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      setSelectedProducts(prev => [...prev, { ...product, quantity: 1 }]);
    }
  };

  const handleProductQuantityChange = (productId, quantity) => {
    if (quantity <= 0) {
      setSelectedProducts(prev => prev.filter(p => p.id !== productId));
    } else {
      setSelectedProducts(prev => prev.map(p => p.id === productId ? { ...p, quantity } : p));
    }
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const calculateOrderTotal = () => {
    return selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  };

  const createOrder = async () => {
    const shop = role === 'shopkeeper' ? (user?.name || '') : form.shop;
    const man = role === 'salesman' ? (user?.name || '') : form.man;
    const total = calculateOrderTotal();
    
    if (!shop || !man || selectedProducts.length === 0 || total === 0) {
      toast.error('Please select at least one product and fill all required fields');
      return;
    }
    
    setSaving(true);
    try {
      const newOrder = await orderApi.createOrder({
        shop,
        man,
        items: selectedProducts.map(p => ({ productId: p.id, quantity: p.quantity })),
        total: Math.round(total),
        status: form.status,
        pay: form.pay,
      });
      onSendNotification?.({ type: 'order', msg: `New order ${newOrder.id} placed by ${shop}` });
      onOrderCreated(newOrder);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(13, 42, 20, 0.45)', backdropFilter: 'blur(4px)', zIndex: 999 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{ position: 'fixed', top: '5%', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, maxHeight: '90vh', overflow: 'hidden', width: '90%', maxWidth: '850px', animation: 'slideUp 0.2s ease-out', background: C.card, borderRadius: 16, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', border: `1.5px solid ${C.goldBorder}` }}
      >
        <div style={{ padding: 24, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 id="modal-title" style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>Place New Sales Order</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: C.muted }} aria-label="Close dialog">&times;</button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: 18, paddingBottom: 16, borderBottom: `1.5px solid ${C.border}` }}>
            <div>
              <label htmlFor="order-shop" style={{ display: 'block', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>Shopkeeper</label>
              {role === 'shopkeeper' ? (
                <input id="order-shop" value={user?.name || ''} readOnly style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none', fontSize: 13 }} aria-label="Shopkeeper name" />
              ) : (
                <select id="order-shop" value={form.shop} onChange={e => setForm({ ...form, shop: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none', fontSize: 13, cursor: 'pointer' }} aria-label="Select Shopkeeper">
                  <option value="">Select shop...</option>
                  {shopkeepers.map(s => <option key={s.id || s._id} value={s.name}>{s.name}</option>)}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="order-man" style={{ display: 'block', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>Salesman</label>
              {role === 'salesman' ? (
                <input id="order-man" value={user?.name || ''} readOnly style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none', fontSize: 13 }} aria-label="Salesman name" />
              ) : (
                <select id="order-man" value={form.man} onChange={e => setForm({ ...form, man: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none', fontSize: 13, cursor: 'pointer' }} aria-label="Select Salesman">
                  <option value="">Select salesman...</option>
                  {salesmen.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="order-pay" style={{ display: 'block', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>Payment Method</label>
              <select id="order-pay" value={form.pay} onChange={e => setForm({ ...form, pay: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text, outline: 'none', fontSize: 13, cursor: 'pointer' }} aria-label="Select Payment Method">
                {['full','installment'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
              Select Products Catalog
              {selectedProducts.length > 0 && <span style={{ fontSize: 12, color: C.muted, fontWeight: 400, marginLeft: 8 }}>({selectedProducts.length} unique items selected)</span>}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {products.map(p => {
                const isSelected = selectedProducts.some(sp => sp.id === p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => !isSelected && handleProductSelect(p)}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isSelected) { e.preventDefault(); handleProductSelect(p); } }}
                    style={{ background: isSelected ? C.goldBg : C.card, border: `2px solid ${isSelected ? C.gold : C.border}`, borderRadius: 10, padding: 12, cursor: isSelected ? 'default' : 'pointer', transition: 'all 0.15s ease' }}
                    className="focus-ring"
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`Select ${p.name}`}
                  >
                    {p.imageUrl && (
                      <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, background: '#fcfcfc', borderRadius: 6 }}>
                        <img src={p.imageUrl} alt="" style={{ maxHeight: 70, maxWidth: '90%', objectFit: 'contain' }} />
                      </div>
                    )}
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2, lineHeight: 1.3 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>{p.size || p.cat}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, marginBottom: isSelected ? 8 : 0 }}>PKR {p.price.toLocaleString()}</div>
                    
                    {isSelected && (
                      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, borderTop: `1px solid ${C.goldBorder}`, paddingTop: 8 }}>
                        <button onClick={() => handleProductQuantityChange(p.id, selectedProducts.find(sp => sp.id === p.id).quantity - 1)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.goldBorder}`, borderRadius: 6, background: C.card, cursor: 'pointer', fontSize: 14, fontWeight: 'bold', color: C.text }}>−</button>
                        <input type="number" min="0" value={selectedProducts.find(sp => sp.id === p.id).quantity} onChange={e => handleProductQuantityChange(p.id, parseInt(e.target.value) || 0)} style={{ flex: 1, padding: '4px', border: `1px solid ${C.goldBorder}`, borderRadius: 6, background: C.card, color: C.text, textAlign: 'center', fontSize: 13, outline: 'none' }} />
                        <button onClick={() => handleProductQuantityChange(p.id, selectedProducts.find(sp => sp.id === p.id).quantity + 1)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.goldBorder}`, borderRadius: 6, background: C.gold, cursor: 'pointer', fontSize: 14, fontWeight: 'bold', color: '#fff' }}>+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {selectedProducts.length > 0 && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Selected Items Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedProducts.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ flex: 1, paddingRight: 10 }}>
                      <span style={{ fontWeight: 700, color: C.text }}>{p.name}</span>
                      <span style={{ color: C.muted, marginLeft: 8 }}>@ PKR {p.price.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => handleProductQuantityChange(p.id, p.quantity - 1)} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, borderRadius: 6, background: C.card, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }} aria-label={`Decrease quantity of ${p.name}`}>−</button>
                      <input type="number" min="1" value={p.quantity} onChange={e => handleProductQuantityChange(p.id, parseInt(e.target.value) || 1)} style={{ width: 44, padding: '3px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.card, color: C.text, textAlign: 'center', fontSize: 12, outline: 'none' }} aria-label={`Quantity of ${p.name}`} />
                      <button onClick={() => handleProductQuantityChange(p.id, p.quantity + 1)} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, borderRadius: 6, background: C.card, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }} aria-label={`Increase quantity of ${p.name}`}>+</button>
                      <button onClick={() => handleRemoveProduct(p.id)} style={{ padding: '4px 8px', border: `1px solid ${C.danger}33`, borderRadius: 6, background: C.card, color: C.danger, cursor: 'pointer', fontSize: 11, fontWeight: 700, marginLeft: 8 }} aria-label={`Remove ${p.name}`}>Remove</button>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 90, fontWeight: 700, color: C.gold }}>PKR {(p.price * p.quantity).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, color: C.text }}>Grand Order Total:</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.gold }}>PKR {calculateOrderTotal().toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, padding: 24, borderTop: `1px solid ${C.border}`, background: `${C.card}` }}>
          <button
            onClick={createOrder}
            disabled={saving || selectedProducts.length === 0}
            style={{ flex: 1, padding: '11px', background: saving || selectedProducts.length === 0 ? C.border : C.gold, border: 'none', borderRadius: 8, color: saving || selectedProducts.length === 0 ? C.muted : 'white', cursor: saving || selectedProducts.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.15s ease' }}
            aria-disabled={saving || selectedProducts.length === 0}
          >
            {saving ? 'Submitting...' : '✓ Submit Sales Order'}
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '11px', background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.15s ease' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
});

export default NewOrderModal;
