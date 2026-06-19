import React, { useState } from 'react';
import C from '../theme';
import SectionHeader from '../components/SectionHeader';
import Badge from '../components/Badge';
import { SkeletonTable } from '../components/common/Skeleton';
import { ApiError } from '../components/ApiMessage';
import { THead, TRow, TCell } from '../components/Table';
import { useFetch } from '../hooks/useFetch';
import { paymentApi } from '../api/paymentApi';

export default function Transactions() {
  const { data: transactions, loading, error } = useFetch(() => paymentApi.getTransactions(), []);

  if (loading) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SectionHeader title="Transaction Logs" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <ApiError error={error} />
      <SectionHeader title="System Transaction Logs" />

      <div style={{ marginBottom: '16px', padding: '12px 16px', background: `${C.success}11`, border: `1px solid ${C.success}44`, borderRadius: 8, fontSize: 13, color: C.text }}>
        <strong>Module Proof:</strong> The transaction logs below prove the execution of the Simulated Transaction Module. These transactions execute automatically and instantly upon order creation with a simulated gateway.
      </div>

      <div className="table-responsive-container" style={{ borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <THead cols={['TXN ID', 'Date', 'Shopkeeper', 'Order Ref', 'Amount', 'Status', 'Gateway Response']} />
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <TCell colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No transactions recorded yet.</TCell>
              </tr>
            ) : (
              transactions.map(t => (
                <TRow key={t.id}>
                  <TCell bold style={{ color: C.gold }}>{t.transactionId}</TCell>
                  <TCell>{new Date(t.createdAt).toLocaleDateString()}</TCell>
                  <TCell>{t.shop}</TCell>
                  <TCell>{t.orderId}</TCell>
                  <TCell bold>PKR {t.amount?.toLocaleString()}</TCell>
                  <TCell><Badge s={t.status} /></TCell>
                  <TCell style={{ fontSize: 11, color: C.muted, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.gatewayResponse}
                  </TCell>
                </TRow>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
