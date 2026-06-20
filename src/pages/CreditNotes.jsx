import React, { useMemo } from 'react';
import SectionHeader from '../components/SectionHeader';
import PageLoader from '../components/PageLoader';
import { ApiError } from '../components/ApiMessage';
import DataGrid from '../components/DataGrid';
import { useCreditNotes } from '../queries/useCreditNotes';
import { Badge, Typography } from '../components/ui';

export default function CreditNotes({ role }) {
  const { data: notes = [], isPending, error } = useCreditNotes();

  const columns = useMemo(() => [
    { header: 'Credit Note', accessorKey: 'creditNoteId', cell: n => <Typography variant="body" weight="semibold">{n.creditNoteId}</Typography> },
    { header: 'RMA', accessorKey: 'returnRequest', cell: n => typeof n.returnRequest === 'object' ? n.returnRequest.rmaId : '—' },
    { header: 'Order', accessorKey: 'order', cell: n => typeof n.order === 'object' ? n.order.orderId : n.order },
    { header: 'Shop', accessorKey: 'shop' },
    { header: 'Total', accessorKey: 'total', cell: n => `PKR ${(n.total || 0).toLocaleString()}` },
    { header: 'Status', accessorKey: 'status', cell: n => <Badge variant={n.status === 'POSTED' ? 'success' : 'default'}>{n.status}</Badge> },
    { header: 'Posted', accessorKey: 'postedAt', cell: n => n.postedAt ? new Date(n.postedAt).toLocaleDateString() : '—' },
  ], []);

  if (role !== 'admin' && role !== 'shopkeeper' && role !== 'salesman') {
    return <div className="page-enter"><Typography variant="body">Access denied.</Typography></div>;
  }

  if (isPending) return <PageLoader label="Loading credit notes..." />;

  return (
    <div className="page-enter flex flex-col h-full">
      <ApiError error={error} />
      <SectionHeader title="Credit Notes" />
      <div className="flex-1 min-h-[300px]">
        <DataGrid columns={columns} data={notes} emptyMessage="No credit notes yet. They are created when returns are received and settled." />
      </div>
    </div>
  );
}
