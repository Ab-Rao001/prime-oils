import React, { useMemo, useState, useEffect } from 'react';
import { EnterpriseModal, Typography, Button, Select, Input } from '../ui';
import { RETURN_REASONS, RESOLUTION_TYPES } from '../../api/returnApi';
import { useOrders } from '../../queries/useOrders';

export default function ConvertComplaintModal({
  isOpen,
  onClose,
  complaint,
  onSubmit,
  isLoading = false,
}) {
  const { data: orders = [] } = useOrders();
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('Quality issue');
  const [resolutionType, setResolutionType] = useState('REFUND');
  const [quantities, setQuantities] = useState({});

  const eligibleOrders = useMemo(
    () => orders.filter(o => ['delivered', 'partially_delivered', 'return_requested'].includes(o.status)),
    [orders]
  );

  const selectedOrder = useMemo(
    () => eligibleOrders.find(o => o.id === orderId || o._id === orderId),
    [eligibleOrders, orderId]
  );

  useEffect(() => {
    if (!isOpen || !complaint) return;
    setOrderId(complaint.orderRef?._id || complaint.orderRef || '');
    setReason('Quality issue');
    setResolutionType('REFUND');
    setQuantities({});
  }, [isOpen, complaint]);

  useEffect(() => {
    if (!selectedOrder?.lineItems) return;
    const initial = {};
    selectedOrder.lineItems.forEach(li => {
      const matchProduct = complaint?.product && li.productName === complaint.product;
      initial[li.productId] = matchProduct ? li.quantity : 0;
    });
    if (Object.values(initial).every(v => v === 0) && selectedOrder.lineItems[0]) {
      initial[selectedOrder.lineItems[0].productId] = 1;
    }
    setQuantities(initial);
  }, [selectedOrder, complaint]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!complaint || !selectedOrder) return;

    const products = Object.entries(quantities)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([productId, quantity]) => ({ productId, quantity: Number(quantity) }));

    if (products.length === 0) return;

    onSubmit({
      complaintId: complaint.id,
      orderId: selectedOrder.id || selectedOrder.orderId,
      products,
      reason,
      resolutionType,
    });
  };

  if (!complaint) return null;

  return (
    <EnterpriseModal isOpen={isOpen} onClose={onClose} title={`Convert ${complaint.id} to Return`} size="lg">
      <Typography variant="body" className="text-muted-foreground mb-4 block">
        Issue: {complaint.issue}
      </Typography>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Linked Order" required value={orderId} onChange={e => setOrderId(e.target.value)}>
          <option value="">Select order...</option>
          {eligibleOrders.map(o => (
            <option key={o._id || o.id} value={o.id || o.orderId}>
              {o.id} — {o.shop}
            </option>
          ))}
        </Select>

        {selectedOrder?.lineItems?.length > 0 && (
          <div className="border border-border dark:border-border-dark rounded-lg divide-y divide-border dark:divide-border-dark">
            {selectedOrder.lineItems.map(li => (
              <div key={li.productId} className="flex items-center justify-between p-3 gap-3">
                <Typography variant="body" weight="semibold">{li.productName}</Typography>
                <Input
                  type="number"
                  min={0}
                  max={li.quantity}
                  className="w-24"
                  value={quantities[li.productId] ?? 0}
                  onChange={e => setQuantities(prev => ({
                    ...prev,
                    [li.productId]: Math.min(li.quantity, Math.max(0, Number(e.target.value) || 0)),
                  }))}
                />
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select label="Reason" value={reason} onChange={e => setReason(e.target.value)}>
            {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Select label="Resolution" value={resolutionType} onChange={e => setResolutionType(e.target.value)}>
            {RESOLUTION_TYPES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </Select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" isLoading={isLoading} disabled={!selectedOrder}>
            Create Return Request
          </Button>
        </div>
      </form>
    </EnterpriseModal>
  );
}
