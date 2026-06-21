import React, { useState, useEffect } from 'react';
import C from '../../theme';
import { orderApi } from '../../api/orderApi';
import toast from 'react-hot-toast';
import { LocationDisplay } from '../ui';

export default function SupplierOrderModal({ order, shopkeeper, onClose, onStatusChange }) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (order && order.shop) {
      orderApi.getOrders().then(res => {
        const ordersList = Array.isArray(res) ? res : (res?.data ?? []);
        setHistory(ordersList.filter(o => o.shop === order.shop && o.id !== order.id).slice(0, 5));
      });
    }
  }, [order]);

  if (!order) return null;

  const handleAccept = async () => {
    setProcessing(true);
    try {
      // Set to confirmed to trigger picking list
      await onStatusChange(order.id, 'confirmed');
      toast.success('Order accepted. Stock reserved and picking list generated.');
      onClose();
    } catch (e) {
      toast.error(e.message || 'Failed to accept order');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setProcessing(true);
    try {
      await onStatusChange(order.id, 'cancelled', rejectReason);
      toast.success('Order rejected and customer notified.');
      onClose();
    } catch (e) {
      toast.error(e.message || 'Failed to reject order');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={ { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
      <div style={ { background: C.card, borderRadius: 16, padding: '24px', width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={ { margin: '0 0 20px 0', fontSize: 22, color: C.text }}>Supplier Order Review: {order.id}</h2>

        <div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div style={ { background: C.bg, padding: 16, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <h3 style={ { margin: '0 0 10px 0', fontSize: 16, color: C.gold }}>Customer Details</h3>
            <div style={ { fontSize: 14, color: C.text }}>
              <p style={ { margin: '4px 0' }}><strong>Shop:</strong> {shopkeeper?.name || order.shop}</p>
              <p style={{ margin: '4px 0' }}><strong>Location:</strong> <LocationDisplay loc={shopkeeper?.location} /></p>
              <p style={ { margin: '4px 0' }}><strong>Contact:</strong> {shopkeeper?.contact || 'N/A'}</p>
            </div>
          </div>
          <div style={ { background: C.bg, padding: 16, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <h3 style={ { margin: '0 0 10px 0', fontSize: 16, color: C.gold }}>Outstanding Information</h3>
            <div style={ { fontSize: 14, color: C.text }}>
              <p style={ { margin: '4px 0' }}><strong>Current Debt:</strong> PKR {shopkeeper?.credit?.toLocaleString() || 0}</p>
              <p style={ { margin: '4px 0' }}><strong>Credit Limit:</strong> PKR {shopkeeper?.creditLimit?.toLocaleString() || 0}</p>
              <p style={ { margin: '4px 0', color: (shopkeeper?.credit || 0) > (shopkeeper?.creditLimit || 0) ? C.danger : C.success }}>
                Status: {(shopkeeper?.credit || 0) > (shopkeeper?.creditLimit || 0) ? 'Exceeded Limit' : 'Within Limit'}
              </p>
            </div>
          </div>
        </div>

        <div style={ { background: C.bg, padding: 16, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 20 }}>
          <h3 style={ { margin: '0 0 10px 0', fontSize: 16, color: C.gold }}>Order Items ({order.items} total qty)</h3>
          <table style={ { width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={ { borderBottom: `1px solid ${C.border}`, textAlign: 'left' }}>
                <th style={ { padding: '8px 0', color: C.muted }}>Product</th>
                <th style={ { padding: '8px 0', color: C.muted }}>Quantity</th>
                <th style={ { padding: '8px 0', color: C.muted, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.lineItems?.map((item, i) => (
                <tr key={i} style={ { borderBottom: `1px solid ${C.border}44` }}>
                  <td style={ { padding: '8px 0' }}>{item.productName}</td>
                  <td style={ { padding: '8px 0' }}>{item.quantity}</td>
                  <td style={ { padding: '8px 0', textAlign: 'right' }}>PKR {item.totalCost?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={ { padding: '8px 0', fontWeight: 'bold' }}>Order Total</td>
                <td style={ { padding: '8px 0', textAlign: 'right', fontWeight: 'bold', color: C.gold }}>PKR {order.total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={ { background: C.bg, padding: 16, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 24 }}>
          <h3 style={ { margin: '0 0 10px 0', fontSize: 16, color: C.gold }}>Previous Order History (Last 5)</h3>
          {history.length > 0 ? (
            <div style={ { display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map(h => (
                <div key={h.id} style={ { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.text, padding: '8px', background: C.card, borderRadius: 6 }}>
                  <span>{new Date(h.date).toLocaleDateString()} - {h.id}</span>
                  <span>PKR {h.total.toLocaleString()}</span>
                  <span style={ { color: h.status === 'delivered' ? C.success : (h.status === 'cancelled' ? C.danger : C.info) }}>
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={ { margin: 0, fontSize: 13, color: C.muted }}>No previous orders found.</p>
          )}
        </div>

        {showRejectForm ? (
          <div style={ { marginBottom: 20 }}>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejecting this order..."
              style={ { width: '100%', padding: 12, border: `1px solid ${C.danger}88`, borderRadius: 8, background: C.bg, color: C.text, minHeight: 80, boxSizing: 'border-box', marginBottom: 12 }}
            />
            <div style={ { display: 'flex', gap: 12 }}>
              <button
                onClick={handleReject}
                disabled={processing}
                style={ { flex: 1, padding: '12px 0', background: C.danger, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: processing ? 'not-allowed' : 'pointer' }}
              >
                {processing ? 'Processing...' : 'Confirm Reject'}
              </button>
              <button
                onClick={() => setShowRejectForm(false)}
                disabled={processing}
                style={ { flex: 1, padding: '12px 0', background: 'transparent', border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, cursor: processing ? 'not-allowed' : 'pointer' }}
              >
                Cancel Rejection
              </button>
            </div>
          </div>
        ) : (
          <div style={ { display: 'flex', gap: 12 }}>
            <button
              onClick={() => onClose()}
              disabled={processing}
              style={ { flex: 1, padding: '12px 0', background: 'transparent', border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, cursor: processing ? 'not-allowed' : 'pointer', fontWeight: 600 }}
            >
              Close
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={processing || !['pending', 'paid'].includes(order.status)}
              style={ { flex: 1, padding: '12px 0', background: C.danger + '22', border: `1px solid ${C.danger}66`, color: C.danger, borderRadius: 8, cursor: (processing || !['pending', 'paid'].includes(order.status)) ? 'not-allowed' : 'pointer', fontWeight: 600 }}
            >
              Reject Order
            </button>
            <button
              onClick={handleAccept}
              disabled={processing || !['pending', 'paid'].includes(order.status)}
              style={ { flex: 2, padding: '12px 0', background: C.gold, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: (processing || !['pending', 'paid'].includes(order.status)) ? 'not-allowed' : 'pointer', boxShadow: `0 4px 12px ${C.gold}44` }}
            >
              {processing ? 'Processing...' : 'Accept & Reserve Stock'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
