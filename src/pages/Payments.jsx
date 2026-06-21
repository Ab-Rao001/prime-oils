import React, { useState, useMemo } from 'react';
import C from '../theme';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import PageLoader from '../components/PageLoader';
import { ApiError } from '../components/ApiMessage';
import DataGrid from '../components/DataGrid';
import { useFetch } from '../hooks/useFetch';
import { paymentApi } from '../api/paymentApi';
import { orderApi } from '../api/orderApi';
import toast from 'react-hot-toast';
import { Badge, EnterpriseModal, Input, Button, Typography } from '../components/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Banknote, Clock, ClipboardList } from 'lucide-react';

const paymentSchema = z.object({
  amount: z.number({ invalid_type_error: "Amount is required" }).positive("Amount must be positive")
});

export default function Payments({ role, user, onSendNotification }) {
  const { data: pays, setData: setPays, loading, error } = useFetch(() => paymentApi.getPayments(), []);
  const { data: orders } = useFetch(() => orderApi.getOrders(), []);
  const [modal, setModal] = useState(null);

  const { register, handleSubmit, formState: { errors, isSubmitting: saving }, reset } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: '' }
  });

  const visiblePays = pays;

  const totalDue = visiblePays.reduce((a, p) => a + Math.max(0, (p.total || 0) - (p.paid || 0)), 0);
  const totalPaid = visiblePays.reduce((a, p) => a + (p.paid || 0), 0);

  const openPaymentModal = (id) => {
    setModal(id);
    reset({ amount: '' });
  };

  const recordPayment = async (data) => {
    if (!modal) return;
    const add = data.amount;
    const p = pays.find(x => x.id === modal);
    if (!p) return;
    
    const newPaid = (p.paid || 0) + add;
    const status = newPaid >= p.total ? 'paid' : newPaid > 0 ? 'partial' : p.status;
    
    try {
      const updated = await paymentApi.updatePayment(modal, { paid: newPaid, status });
      setPays(prev => prev.map(x => x.id === modal ? updated : x));
      onSendNotification?.({ type: 'payment', msg: `Payment of PKR ${add.toLocaleString()} recorded for ${p.shop}` });
      toast.success('Payment recorded successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to record payment');
      // Optimistic rollback not needed if we just show error
    }
    setModal(null);
  };

  const columns = useMemo(() => [
    { header: 'ID', accessorKey: 'id', sortable: true, cell: (p) => <Typography variant="body" weight="semibold">{p.id}</Typography> },
    { header: 'Shop', accessorKey: 'shop', sortable: true },
    { header: 'Total', accessorKey: 'total', sortable: true, cell: (p) => `PKR ${(p.total || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { header: 'Paid', accessorKey: 'paid', sortable: true, cell: (p) => `PKR ${(p.paid || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { 
      header: 'Due', 
      accessorKey: 'due', 
      sortable: true, 
      cell: (p) => {
        const due = Math.max(0, (p.total || 0) - (p.paid || 0));
        return <Typography variant="body" weight="semibold" className={due > 0 ? 'text-danger' : 'text-success'}>PKR {due.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>;
      }
    },
    { header: 'Type', accessorKey: 'type', sortable: true },
    { header: 'Status', accessorKey: 'status', sortable: true, cell: (p) => <Badge variant={p.status === 'paid' ? 'success' : p.status === 'partial' ? 'warning' : 'danger'}>{p.status}</Badge> },
    { header: 'Action', cell: (p) => {
      const due = Math.max(0, (p.total || 0) - (p.paid || 0));
      if (due > 0) {
        return (
          <Button size="xs" variant="outline" onClick={() => openPaymentModal(p.id)}>
            {role === 'shopkeeper' ? 'Pay Now' : 'Record'}
          </Button>
        );
      }
      return null;
    }}
  ], [role]);

  if (loading) return <PageLoader label="Loading payments..." />;

  return (
    <div className="page-enter flex flex-col h-full">
      <SectionHeader title="Payments" />
      <ApiError error={error} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 mb-8">
        <StatCard icon={<Banknote size={24} />} label={role === 'salesman' ? 'Period Collection' : 'Collected'} value={`PKR ${totalPaid.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color={C.success} />
        <StatCard icon={<Clock size={24} />} label={role === 'salesman' ? 'Amount Due in Market' : 'Outstanding'} value={`PKR ${totalDue.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color={C.warn} />
        <StatCard icon={<ClipboardList size={24} />} label="Accounts" value={String(visiblePays.length)} />
      </div>

      <div className="flex-1 min-h-[400px]">
        <DataGrid 
          columns={columns}
          data={visiblePays}
          selectable={false}
          emptyMessage="No payments found."
        />
      </div>

      <EnterpriseModal 
        isOpen={!!modal} 
        onClose={() => setModal(null)} 
        title={role === 'shopkeeper' ? 'Make Payment' : 'Record Payment'}
        size="sm"
      >
        <form onSubmit={handleSubmit(recordPayment)} className="space-y-4">
          <Input 
            label="Amount (PKR)" 
            type="number" 
            placeholder="e.g. 5000" 
            required 
            {...register('amount', { valueAsNumber: true })} 
            error={errors.amount} 
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" isLoading={saving} className="flex-1">
              {role === 'shopkeeper' ? 'Pay' : 'Save'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setModal(null)} disabled={saving} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </EnterpriseModal>
    </div>
  );
}
