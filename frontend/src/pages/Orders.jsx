import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import C from '../theme';
import SectionHeader from '../components/SectionHeader';
import { SkeletonTable } from '../components/common/Skeleton';
import { ApiError } from '../components/ApiMessage';
import DataGrid from '../components/DataGrid';
import { useOrders } from '../queries/useOrders';
import { useShopkeepers, useSalesmen, useUsers } from '../queries/useUsers';
import { useProducts } from '../queries/useInventory';
import { useUpdateOrderStatus } from '../mutations/useOrderMutations';
import { usePayOrder } from '../mutations/usePaymentMutations';
import toast from 'react-hot-toast';
import NewOrderModal from '../components/orders/NewOrderModal';
import SupplierOrderModal from '../components/orders/SupplierOrderModal';
import OrderCompletionModal from '../components/orders/OrderCompletionModal';
import { EmptyState, Badge, EnterpriseModal, Button, Input, Select, Typography } from '../components/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const STATUSES = [
  'all',
  'pending',
  'pending_approval',
  'confirmed',
  'ready_for_dispatch',
  'in_transit',
  'partially_delivered',
  'delivered',
  'return_requested',
  'returned',
  'cancelled',
];

const COUNT_STATUSES = ['pending', 'confirmed', 'ready_for_dispatch', 'in_transit', 'delivered', 'cancelled'];

const NEXT_STATES = {
  pending: ['confirmed', 'cancelled'],
  pending_approval: ['confirmed', 'cancelled'],
  confirmed: ['ready_for_dispatch', 'cancelled'],
  paid: ['ready_for_dispatch', 'cancelled'],
  ready_for_dispatch: [],
  in_transit: [],
  delivered: [],
  cancelled: [],
  partially_delivered: ['return_requested'],
  return_requested: ['returned', 'confirmed'],
  returned: [],
};

const STATUS_COLORS = {
  pending: 'text-warn',
  confirmed: 'text-info',
  ready_for_dispatch: 'text-info',
  in_transit: 'text-info',
  delivered: 'text-success',
  cancelled: 'text-danger',
};

const paymentSchema = z.object({
  amount: z.number({ invalid_type_error: "Amount is required" }).positive("Amount must be positive")
});

export default function Orders({ role, user, onSendNotification }) {
  const queryClient = useQueryClient();
  const { data: orders = [], isPending, error } = useOrders();
  const { data: shopkeepers = [], isPending: shopsLoading } = useShopkeepers();
  const { data: products = [], isPending: productsLoading } = useProducts();
  const { data: dbSalesmen = [] } = useSalesmen();
  const { data: users = [] } = useUsers({ enabled: role === 'admin' });
  
  const { mutate: updateStatusMutation } = useUpdateOrderStatus();
  const { mutateAsync: payOrderMutation } = usePayOrder();
  
  const [filter, setFilter] = useState('all');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [supplierReviewOrder, setSupplierReviewOrder] = useState(null);
  const [selectedCompletionOrder, setSelectedCompletionOrder] = useState(null);

  const { register, handleSubmit, formState: { errors, isSubmitting: savingPayment }, reset: resetPayment } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: '' }
  });

  const salesmen = useMemo(() => {
    const fromOrders = orders.map(o => o.man).filter(Boolean);
    const fromUsers = users.filter(u => u.role === 'salesman').map(u => u.name).filter(Boolean);
    const fromDb = dbSalesmen.map(u => u.name).filter(Boolean);
    return Array.from(new Set([...fromOrders, ...fromUsers, ...fromDb].filter(Boolean)));
  }, [orders, users, dbSalesmen]);

  const canCreateOrder = role === 'admin' || role === 'shopkeeper' || role === 'salesman';

  const baseOrders = useMemo(() => {
    if (role === 'supplier') return orders.filter(o => o.status !== 'cancelled');
    return orders;
  }, [orders, role]);

  const filtered = useMemo(() => {
    return baseOrders.filter(o => filter === 'all' || o.status === filter);
  }, [baseOrders, filter]);

  const updateStatus = (id, status, reason) => {
    updateStatusMutation({ id, status });
    if (status === 'delivered') {
      onSendNotification?.({ type: 'delivery', msg: `Order ${id} delivered` });
    }
  };

  const openPayModal = (order) => {
    setPayModal(order);
    resetPayment({ amount: (order.total - (order.paidAmount || 0)) });
  };

  const onPay = async (data) => {
    if (!payModal) return;
    try {
      await payOrderMutation({ orderId: payModal.id, amount: data.amount });
      onSendNotification?.({ type: 'payment', msg: `Payment of PKR ${data.amount} recorded for order ${payModal.id}` });
      toast.success('Payment successful');
    } catch (e) {
      toast.error('Payment failed');
    }
    setPayModal(null);
  };

  const columns = useMemo(() => [
    { header: 'Date', accessorKey: 'date', sortable: true, cell: (o) => new Date(o.date).toLocaleDateString() },
    { header: 'Order ID', accessorKey: 'id', sortable: true, cell: (o) => <Typography variant="body" weight="semibold">{o.id}</Typography> },
    { header: 'Shop', accessorKey: 'shop', sortable: true },
    { header: 'Salesman', accessorKey: 'man', sortable: true },
    { header: 'Items', accessorKey: 'items', sortable: true },
    { header: 'Total', accessorKey: 'total', sortable: true, cell: (o) => <Typography variant="body" weight="semibold">PKR {o.total.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography> },
    { header: 'Payment', accessorKey: 'paymentStatus', cell: (o) => (
      <div className="flex flex-col gap-1 items-start">
        <Badge variant="default">{o.pay}</Badge>
        <Badge variant={o.paymentStatus === 'paid' ? 'success' : (o.paymentStatus === 'partial' ? 'warning' : 'danger')}>
          {o.paymentStatus === 'paid' ? 'Paid' : (o.paymentStatus === 'partial' ? 'Partial' : 'Unpaid')}
        </Badge>
      </div>
    )},
    { header: 'Status', accessorKey: 'status', sortable: true, cell: (o) => <Badge variant={['pending', 'pending_approval'].includes(o.status) ? 'warning' : o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : 'default'}>{o.status}</Badge> },
    { header: 'Actions', width: 200, cell: (o) => (
      <div className="flex gap-2 items-center">
        {role === 'admin' && (() => {
          const options = NEXT_STATES[o.status] || [];
          if (options.length === 0) {
            return <Badge variant="default">{o.status}</Badge>;
          }
          return (
            <select
              value={o.status}
              onChange={e => updateStatus(o.id, e.target.value)}
              className="px-2 py-1 border border-border dark:border-border-dark rounded-md text-xs bg-bg dark:bg-bg-dark outline-none cursor-pointer"
              aria-label={`Update status for order ${o.id}`}
            >
              <option value={o.status}>{o.status.charAt(0).toUpperCase() + o.status.slice(1)}</option>
              {options.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}</option>
              ))}
            </select>
          );
        })()}

        {role === 'supplier' && (
          <>
            {['pending', 'pending_approval', 'paid'].includes(o.status) && (
              <Button size="xs" variant="outline" onClick={() => setSupplierReviewOrder(o)}>
                Review
              </Button>
            )}
            {['confirmed', 'paid'].includes(o.status) && (
              <Button size="xs" variant="success" onClick={() => updateStatus(o.id, 'ready_for_dispatch')}>
                Prepare
              </Button>
            )}
            {o.status === 'ready_for_dispatch' && (
              <Typography variant="caption" className="text-success font-bold">Prepared</Typography>
            )}
          </>
        )}

        {(role !== 'admin' && role !== 'supplier' && role !== 'salesman') && (
          o.status !== 'cancelled' ? (
            o.paymentStatus === 'paid' ? (
              <Typography variant="caption" className="text-success font-bold">Fully Paid</Typography>
            ) : (
              <Button size="xs" variant="outline" onClick={() => openPayModal(o)}>
                Pay
              </Button>
            )
          ) : (
            <span className="text-muted text-xs">—</span>
          )
        )}
        
        {['delivered', 'partially_delivered', 'return_requested', 'returned'].includes(o.status) && (
           <Button size="xs" variant="primary" onClick={() => setSelectedCompletionOrder(o.id)}>
             Details
           </Button>
        )}
      </div>
    )}
  ], [role, updateStatus]);

  if (isPending || shopsLoading || productsLoading) {
    return (
      <div className="page-enter flex flex-col gap-5">
        <SectionHeader title="Order Management" />
        <SkeletonTable rows={5} cols={8} />
      </div>
    );
  }

  return (
    <div className="page-enter flex flex-col h-full">
      <ApiError error={error} />
      <SectionHeader
        title="Order Management"
        btn={canCreateOrder ? 'New Order' : null}
        onBtn={() => setShowNewOrder(true)}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {COUNT_STATUSES.map((s) => (
          <div key={s} className="card-premium p-3 text-center">
            <Typography variant="h2" size="2xl" className={`font-extrabold ${STATUS_COLORS[s] || 'text-muted-foreground'}`}>
              {baseOrders.filter(o => o.status === s).length}
            </Typography>
            <Typography variant="caption" className="text-muted-foreground mt-1 uppercase tracking-wider font-semibold">{s.replace(/_/g, ' ')}</Typography>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Filter orders by status">
          {STATUSES.map(f => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 border-1.5 rounded-full text-xs cursor-pointer capitalize transition-all duration-150 ${filter === f ? 'border-gold bg-gold/10 text-gold font-semibold' : 'border-border dark:border-border-dark bg-card dark:bg-card-dark text-muted-foreground font-medium'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[300px]">
        <DataGrid 
          columns={columns}
          data={filtered}
          selectable={true}
          emptyMessage="There are no orders matching your current filters."
        />
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
        onOrderCreated={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}
      />

      {supplierReviewOrder && (
        <SupplierOrderModal
          order={supplierReviewOrder}
          shopkeeper={shopkeepers.find(s => s.name === supplierReviewOrder.shop) || null}
          onClose={() => setSupplierReviewOrder(null)}
          onStatusChange={updateStatus}
        />
      )}

      <EnterpriseModal 
        isOpen={!!payModal} 
        onClose={() => setPayModal(null)} 
        title={`Pay Order ${payModal?.id}`}
        size="sm"
      >
        <form onSubmit={handleSubmit(onPay)} className="space-y-4">
          <Typography variant="caption" className="text-muted-foreground block">
            Total: PKR {payModal?.total.toLocaleString()}
          </Typography>
          <Input 
            label="Amount (PKR)" 
            type="number" 
            placeholder="Amount" 
            required 
            {...register('amount', { valueAsNumber: true })} 
            error={errors.amount} 
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" isLoading={savingPayment} className="flex-1">
              Pay
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPayModal(null)} disabled={savingPayment} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </EnterpriseModal>

      <OrderCompletionModal 
        isOpen={!!selectedCompletionOrder} 
        onClose={() => setSelectedCompletionOrder(null)} 
        orderId={selectedCompletionOrder} 
      />
    </div>
  );
}
