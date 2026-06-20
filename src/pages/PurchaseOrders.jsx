import React, { useState, useMemo } from 'react';
import C from '../theme';
import SectionHeader from '../components/SectionHeader';
import { useFetch } from '../hooks/useFetch';
import { inventoryApi } from '../api/inventoryApi';
import Badge from '../components/Badge';
import { SkeletonTable } from '../components/common/Skeleton';
import DataGrid from '../components/DataGrid';
import { ConfirmationDialog } from '../components/ui';
import toast from 'react-hot-toast';

export default function PurchaseOrders({ role, users }) {
  const { data: pos, setData: setPos, loading } = useFetch(() => inventoryApi.getPurchaseOrders(), []);
  const { data: products } = useFetch(() => inventoryApi.getProducts(), []);
  
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState({ isOpen: false, po: null });
  const [form, setForm] = useState({ supplier: '', notes: '', items: [] });
  
  const suppliers = useMemo(() => (users || []).filter(u => u.role === 'supplier'), [users]);

  const handleAddItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, unitCost: 0 }]
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...form.items];
    updated[index][field] = value;
    setForm(prev => ({ ...prev, items: updated }));
  };

  const handleRemoveItem = index => {
    const updated = form.items.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, items: updated }));
  };

  const totalAmount = form.items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitCost || 0)), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.items.length === 0) return toast.error('Add at least one item');
    
    for (const item of form.items) {
      if (!item.productId) return toast.error('Select a product for all items');
      if (item.quantity <= 0) return toast.error('Quantity must be greater than 0');
      if (item.unitCost < 0) return toast.error('Cost cannot be negative');
    }

    setSaving(true);
    try {
      const created = await inventoryApi.createPurchaseOrder({
        supplier: form.supplier || undefined,
        notes: form.notes,
        items: form.items.map(i => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost)
        }))
      });
      setPos(prev => [created, ...prev]);
      setShowModal(false);
      setForm({ supplier: '', notes: '', items: [] });
      toast.success('Purchase order created');
    } catch (err) {
      toast.error(err.message || 'Failed to create PO');
    } finally {
      setSaving(false);
    }
  };

  const handleReceiveClick = (po) => {
    setConfirmState({ isOpen: true, po });
  };

  const executeReceive = async () => {
    const { po } = confirmState;
    if(!po) return;
    try {
      const updated = await inventoryApi.receivePurchaseOrder(po._id);
      setPos(prev => prev.map(p => p._id === updated._id ? updated : p));
      toast.success('Inventory securely updated (Stock In)');
    } catch (err) {
      toast.error(err.message || 'Failed to receive goods');
    }
  };

  const columns = useMemo(() => [
    { header: 'PO ID', accessorKey: 'poId', sortable: true, cell: (po) => <span style={ { fontWeight: 600 }}>{po.poId}</span> },
    { header: 'Date', accessorKey: 'createdAt', sortable: true, cell: (po) => new Date(po.createdAt).toLocaleDateString() },
    { header: 'Supplier', accessorKey: 'supplier', sortable: true, cell: (po) => po.supplier?.name || 'N/A' },
    { header: 'Items', accessorKey: 'items', cell: (po) => (
      <div style={ { fontSize: 12 }}>
        {po.items.map((i, idx) => (
          <div key={idx}>{i.quantity}x {i.productName} (PKR {i.unitCost.toLocaleString()}/ea)</div>
        ))}
      </div>
    )},
    { header: 'Total Cost', accessorKey: 'totalAmount', sortable: true, cell: (po) => <span style={ { fontWeight: 600 }}>PKR {po.totalAmount.toLocaleString()}</span> },
    { header: 'Status', accessorKey: 'status', sortable: true, cell: (po) => <Badge s={po.status} /> },
    { header: 'Actions', cell: (po) => (
      <div style={ { display: 'flex', gap: 8, alignItems: 'center' }}>
        {po.status === 'pending' && role === 'admin' && (
          <button onClick={() => handleReceiveClick(po)} style={ { padding: '6px 12px', background: C.success, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Receive Stock
          </button>
        )}
        {po.status === 'received' && (
          <div style={ { fontSize: 11, color: C.muted }}>Received: {new Date(po.receivedDate).toLocaleDateString()}</div>
        )}
      </div>
    )}
  ], [role]);

  if (loading) {
    return (
      <div className="page-enter" style={ { display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SectionHeader title="Purchase Orders" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div className="page-enter" style={ { display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SectionHeader title="Purchase Orders (Stock In)" action={role === 'admin' ? "Create PO" : null} onAction={() => setShowModal(true)} />
      
      <div style={ { marginBottom: '16px', padding: '12px 16px', background: `${C.info}11`, border: `1px solid ${C.info}44`, borderRadius: 8, fontSize: 13, color: C.text }}>
        <strong>Inventory Best Practice:</strong> Always use Purchase Orders to log incoming stock. This updates the <strong>Cost Price (Moving Average)</strong> of your products, which is strictly required to calculate real profit margins on sales.
      </div>

      <div style={ { flex: 1, minHeight: 400 }}>
        <DataGrid 
          columns={columns}
          data={pos}
          emptyMessage="You have no purchase orders."
          selectable={false}
        />
      </div>

      {showModal && (
        <div style={ { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
          <div style={ { background: C.card, borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={ { padding: 20, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={ { margin: 0, color: C.text, fontSize: 18 }}>Create Purchase Order</h3>
              <button onClick={() => setShowModal(false)} style={ { background: 'none', border: 'none', fontSize: 24, color: C.muted, cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={ { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={ { padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={ { display: 'flex', gap: 16 }}>
                  <div style={ { flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <label style={ { fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Supplier</label>
                    <select value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} style={ { padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14 }}>
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div style={ { flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <label style={ { fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Notes</label>
                    <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Reference or invoice #..." style={ { padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14 }} />
                  </div>
                </div>

                <div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <h4 style={ { margin: 0, fontSize: 14, color: C.text }}>PO Items</h4>
                  <button type="button" onClick={handleAddItem} style={ { padding: '6px 12px', background: `${C.primary}22`, color: C.primary, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Add Item</button>
                </div>

                {form.items.length === 0 && <div style={ { fontSize: 13, color: C.muted, textAlign: 'center', padding: 20 }}>No items added yet.</div>}
                
                {form.items.map((item, idx) => (
                  <div key={idx} style={ { display: 'flex', gap: 10, alignItems: 'flex-end', background: `${C.bg}88`, padding: 12, borderRadius: 8 }}>
                    <div style={ { flex: 2, display: 'flex', flexDirection: 'column' }}>
                      <label style={ { fontSize: 10, color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>Product</label>
                      <select value={item.productId} onChange={e => handleItemChange(idx, 'productId', e.target.value)} style={ { padding: '8px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13 }} required>
                        <option value="">Select...</option>
                        {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div style={ { flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <label style={ { fontSize: 10, color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>Qty</label>
                      <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} style={ { padding: '8px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13 }} required />
                    </div>
                    <div style={ { flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <label style={ { fontSize: 10, color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>Unit Cost</label>
                      <input type="number" min="0" value={item.unitCost} onChange={e => handleItemChange(idx, 'unitCost', e.target.value)} style={ { padding: '8px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13 }} required />
                    </div>
                    <div style={ { padding: '8px 0', fontSize: 13, fontWeight: 600, color: C.text, width: 80, textAlign: 'right' }}>
                      PKR {((item.quantity || 0) * (item.unitCost || 0)).toLocaleString()}
                    </div>
                    <button type="button" onClick={() => handleRemoveItem(idx)} style={ { background: 'none', border: 'none', padding: '8px', color: C.danger, cursor: 'pointer', fontSize: 16 }}>&times;</button>
                  </div>
                ))}
              </div>
              <div style={ { padding: 20, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `${C.bg}55` }}>
                <div style={ { fontSize: 16, color: C.text }}>
                  Total Estimated: <span style={ { fontWeight: 700, color: C.gold }}>PKR {totalAmount.toLocaleString()}</span>
                </div>
                <div style={ { display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={ { padding: '10px 20px', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button type="submit" disabled={saving} style={ { padding: '10px 20px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving...' : 'Create PO'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationDialog 
        isOpen={confirmState.isOpen}
        title="Receive Purchase Order"
        message={`Are you sure you want to mark ${confirmState.po?.poId} as RECEIVED? This will permanently update inventory stock and recalculate Cost of Goods Sold.`}
        onConfirm={executeReceive}
        onClose={() => setConfirmState({ isOpen: false, po: null })}
        confirmText="Receive Stock"
        isDanger={false}
      />
    </div>
  );
}
