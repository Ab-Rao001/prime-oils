import React, { useMemo } from 'react';
import SectionHeader from '../components/SectionHeader';
import { Badge, Typography } from '../components/ui';
import { SkeletonTable } from '../components/common/Skeleton';
import { ApiError } from '../components/ApiMessage';
import DataGrid from '../components/DataGrid';
import { useFetch } from '../hooks/useFetch';
import { paymentApi } from '../api/paymentApi';

export default function Transactions() {
  const { data: transactions, loading, error } = useFetch(() => paymentApi.getTransactions(), []);

  const columns = useMemo(() => [
    { header: 'TXN ID', accessorKey: 'transactionId', sortable: true, cell: (t) => <Typography variant="body" weight="semibold" className="text-gold">{t.transactionId}</Typography> },
    { header: 'Date', accessorKey: 'createdAt', sortable: true, cell: (t) => new Date(t.createdAt).toLocaleDateString() },
    { header: 'Shopkeeper', accessorKey: 'shop', sortable: true },
    { header: 'Order Ref', accessorKey: 'orderId', sortable: true },
    { header: 'Amount', accessorKey: 'amount', sortable: true, cell: (t) => <Typography variant="body" weight="semibold">PKR {t.amount?.toLocaleString()}</Typography> },
    { header: 'Status', accessorKey: 'status', sortable: true, cell: (t) => <Badge variant={t.status === 'success' ? 'success' : 'default'}>{t.status}</Badge> },
    { header: 'Gateway Response', accessorKey: 'gatewayResponse', cell: (t) => (
      <div className="text-[11px] text-muted-foreground max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis">
        {t.gatewayResponse}
      </div>
    )}
  ], []);

  if (loading) {
    return (
      <div className="page-enter flex flex-col gap-5">
        <SectionHeader title="Transaction Logs" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div className="page-enter flex flex-col h-full">
      <ApiError error={error} />
      <SectionHeader title="System Transaction Logs" />

      <div className="mb-4 py-3 px-4 bg-success/10 border border-success/30 rounded-lg text-[13px] text-foreground">
        <strong>Module Proof:</strong> The transaction logs below prove the execution of the Simulated Transaction Module. These transactions execute automatically and instantly upon order creation with a simulated gateway.
      </div>

      <div className="flex-1 min-h-[400px]">
        <DataGrid 
          columns={columns}
          data={transactions}
          emptyMessage="No transactions recorded yet."
          selectable={false}
        />
      </div>
    </div>
  );
}
