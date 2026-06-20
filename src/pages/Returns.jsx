import React, { useMemo, useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import PageLoader from '../components/PageLoader';
import { ApiError } from '../components/ApiMessage';
import DataGrid from '../components/DataGrid';
import CreateReturnModal from '../components/returns/CreateReturnModal';
import InspectReturnModal from '../components/returns/InspectReturnModal';
import ReturnDetailModal from '../components/returns/ReturnDetailModal';
import { useReturns } from '../queries/useReturns';
import { useOrders } from '../queries/useOrders';
import { useQuery } from '@tanstack/react-query';
import { creditNoteApi } from '../api/creditNoteApi';
import {
  useCreateReturn,
  useInspectReturn,
  useApproveReturn,
  useReceiveReturn,
} from '../mutations/useReturnMutations';
import { RETURN_STATUSES } from '../api/returnApi';
import { Badge, Typography, Button } from '../components/ui';

const STATUS_VARIANT = {
  REQUESTED: 'warning',
  INSPECTING: 'info',
  APPROVED: 'info',
  RECEIVED: 'default',
  REJECTED: 'danger',
  COMPLETED: 'success',
};

const COUNT_STATUSES = ['REQUESTED', 'INSPECTING', 'APPROVED', 'COMPLETED', 'REJECTED'];

export default function Returns({ role }) {
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [inspectTarget, setInspectTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  const { data: returns = [], isPending, error } = useReturns(filter === 'all' ? {} : { status: filter });
  const { data: orders = [] } = useOrders();
  const { data: summary } = useQuery({
    queryKey: ['return-summary'],
    queryFn: () => creditNoteApi.getReturnSummary(),
    enabled: role === 'admin' || role === 'salesman',
  });

  const { mutate: createReturn, isPending: creating } = useCreateReturn();
  const { mutate: inspectReturn, isPending: inspecting } = useInspectReturn();
  const { mutate: approveReturn } = useApproveReturn();
  const { mutate: receiveReturn, isPending: receiving } = useReceiveReturn();

  const canCreate = ['admin', 'shopkeeper', 'salesman'].includes(role);
  const isWarehouse = role === 'admin' || role === 'supplier';

  const filtered = useMemo(() => {
    if (filter === 'all') return returns;
    return returns.filter(r => r.status === filter);
  }, [returns, filter]);

  const handleCreate = (body) => {
    createReturn(body, { onSuccess: () => setShowCreate(false) });
  };

  const handleInspect = (body) => {
    inspectReturn(body, { onSuccess: () => setInspectTarget(null) });
  };

  const columns = useMemo(() => [
    {
      header: 'RMA ID',
      accessorKey: 'rmaId',
      cell: r => (
        <button type="button" className="text-left" onClick={() => setDetailTarget(r)}>
          <Typography variant="body" weight="semibold" className="text-gold hover:underline">{r.rmaId || r.id}</Typography>
        </button>
      ),
    },
    {
      header: 'Order',
      accessorKey: 'order',
      cell: r => typeof r.order === 'object' ? r.order.orderId : r.order,
    },
    {
      header: 'Customer',
      accessorKey: 'customer',
      cell: r => typeof r.customer === 'object' ? r.customer.name : r.customer,
    },
    { header: 'Reason', accessorKey: 'reason' },
    {
      header: 'Resolution',
      accessorKey: 'resolutionType',
      cell: r => <Badge variant="default">{(r.resolutionType || 'REFUND').replace(/_/g, ' ')}</Badge>,
    },
    {
      header: 'Items',
      accessorKey: 'products',
      cell: r => `${(r.products || []).reduce((s, p) => s + p.quantity, 0)} units`,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: r => (
        <div className="flex flex-col gap-1">
          <Badge variant={STATUS_VARIANT[r.status] || 'default'}>{r.status}</Badge>
          {r.settlementStatus === 'SETTLED' && <Badge variant="success">Settled</Badge>}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: r => (
        <div className="flex gap-1.5 flex-wrap">
          {isWarehouse && r.status === 'REQUESTED' && (
            <Button size="xs" variant="outline" onClick={() => setInspectTarget(r)}>Inspect</Button>
          )}
          {role === 'admin' && ['REQUESTED', 'INSPECTING'].includes(r.status) && (
            <>
              <Button size="xs" variant="success" onClick={() => approveReturn({ id: r._id, outcome: 'APPROVED' })}>Approve</Button>
              <Button size="xs" variant="danger" onClick={() => approveReturn({ id: r._id, outcome: 'REJECTED' })}>Reject</Button>
            </>
          )}
          {isWarehouse && r.status === 'APPROVED' && (
            <Button size="xs" variant="primary" isLoading={receiving} onClick={() => receiveReturn(r._id)}>
              Receive & Settle
            </Button>
          )}
        </div>
      ),
    },
  ], [role, isWarehouse, approveReturn, receiveReturn, receiving]);

  if (isPending) return <PageLoader label="Loading returns..." />;

  return (
    <div className="page-enter flex flex-col h-full">
      <ApiError error={error} />
      <SectionHeader title="Return Management" btn={canCreate ? 'New Return Request' : null} onBtn={() => setShowCreate(true)} />

      {(role === 'admin' || role === 'salesman') && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="card-premium p-3 text-center">
            <Typography variant="h2" size="xl" className="font-extrabold text-success">
              PKR {(summary.settledTotal || 0).toLocaleString()}
            </Typography>
            <Typography variant="caption" className="text-muted-foreground">Settled Value</Typography>
          </div>
          <div className="card-premium p-3 text-center">
            <Typography variant="h2" size="xl" className="font-extrabold text-info">{summary.settledCount || 0}</Typography>
            <Typography variant="caption" className="text-muted-foreground">Settled Returns</Typography>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {COUNT_STATUSES.map(s => (
          <div key={s} className="card-premium p-3 text-center">
            <Typography variant="h2" size="2xl" className="font-extrabold text-info">
              {returns.filter(r => r.status === s).length}
            </Typography>
            <Typography variant="caption" className="text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
              {s.replace(/_/g, ' ')}
            </Typography>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', ...RETURN_STATUSES].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 border-1.5 rounded-full text-xs cursor-pointer capitalize transition-all ${
              filter === f ? 'border-gold bg-gold/10 text-gold font-semibold' : 'border-border dark:border-border-dark bg-card text-muted-foreground'
            }`}
          >
            {f === 'all' ? 'All' : f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-[300px]">
        <DataGrid columns={columns} data={filtered} emptyMessage="No return requests found. Create a return from a delivered order." />
      </div>

      <CreateReturnModal isOpen={showCreate} onClose={() => setShowCreate(false)} orders={orders} onSubmit={handleCreate} isLoading={creating} />
      <InspectReturnModal isOpen={!!inspectTarget} onClose={() => setInspectTarget(null)} returnItem={inspectTarget} onSubmit={handleInspect} isLoading={inspecting} />
      <ReturnDetailModal isOpen={!!detailTarget} onClose={() => setDetailTarget(null)} returnItem={detailTarget} />
    </div>
  );
}
