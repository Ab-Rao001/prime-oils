import React, { useMemo, useState, useEffect } from 'react';
import { EnterpriseModal, Typography, Button, Select, Input } from '../ui';
import { RETURN_REASONS, RESOLUTION_TYPES } from '../../api/returnApi';
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '../../api/orderApi';

export default function CreateReturnModal({
  isOpen,
  onClose,
  orders = [],
  defaultOrderId = '',
  onSubmit,
  isLoading = false,
}) {
  const eligibleOrders = useMemo(
    () => orders.filter(o => ['delivered', 'partially_delivered', 'return_requested'].includes(o.status)),
    [orders]
  );

  const [orderId, setOrderId] = useState(defaultOrderId || '');
  const [reason, setReason] = useState('Quality issue');
  const [resolutionType, setResolutionType] = useState('REFUND');
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState({});

  const selectedOrder = useMemo(
    () => eligibleOrders.find(o => o.id === orderId || o._id === orderId || o.orderId === orderId),
    [eligibleOrders, orderId]
  );

  const { data: fullOrder, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getOrder(orderId),
    enabled: !!orderId && isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;
    setOrderId(defaultOrderId || '');
    setReason('Quality issue');
    setResolutionType('REFUND');
    setNotes('');
    setQuantities({});
  }, [isOpen, defaultOrderId]);

  useEffect(() => {
    if (!fullOrder?.lineItems) {
      setQuantities({});
      return;
    }
    const initial = {};
    fullOrder.lineItems.forEach(li => {
      initial[li.productId] = li.quantity;
    });
    setQuantities(initial);
  }, [fullOrder]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const products = Object.entries(quantities)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([productId, quantity]) => ({ productId, quantity: Number(quantity) }));

    if (products.length === 0) return;

    onSubmit({
      orderId: selectedOrder.id || selectedOrder.orderId || selectedOrder._id,
      products,
      reason,
      resolutionType,
      notes: notes || undefined,
    });
  };

  return (
    <EnterpriseModal isOpen={isOpen} onClose={onClose} title="Create Return Request" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Order"
          required
          value={orderId}
          onChange={e => setOrderId(e.target.value)}
        >
          <option value="">Select delivered order...</option>
          {eligibleOrders.map(o => (
            <option key={o._id || o.id} value={o.id || o.orderId}>
              {o.id || o.orderId} — {o.shop} (PKR {(o.total || 0).toLocaleString()})
            </option>
          ))}
        </Select>

        {isLoadingOrder ? (
          <Typography variant="body" className="text-muted-foreground">Loading order details...</Typography>
        ) : fullOrder?.lineItems?.length > 0 ? (
          <div>
            <Typography variant="caption" className="text-muted-foreground uppercase font-bold block mb-2">
              Products to Return
            </Typography>
            <div className="border border-border dark:border-border-dark rounded-lg divide-y divide-border dark:divide-border-dark">
              {fullOrder.lineItems.map(li => (
                <div key={li.productId} className="flex items-center justify-between p-3 gap-3">
                  <div>
                    <Typography variant="body" weight="semibold">{li.productName}</Typography>
                    <Typography variant="caption" className="text-muted-foreground">
                      Ordered: {li.quantity} units
                    </Typography>
                  </div>
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
          </div>
        ) : selectedOrder && (
          <Typography variant="body" className="text-danger">Failed to load line items.</Typography>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select label="Reason" required value={reason} onChange={e => setReason(e.target.value)}>
            {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Select label="Resolution" value={resolutionType} onChange={e => setResolutionType(e.target.value)}>
            {RESOLUTION_TYPES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </Select>
        </div>

        <Input
          label="Notes"
          placeholder="Optional details..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" isLoading={isLoading} disabled={!selectedOrder || isLoadingOrder || !fullOrder?.lineItems}>
            Submit Return Request
          </Button>
        </div>
      </form>
    </EnterpriseModal>
  );
}
