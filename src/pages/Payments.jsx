import React, { useState } from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import PageLoader from '../components/PageLoader';
import { ApiError } from '../components/ApiMessage';
import { THead, TRow, TCell } from '../components/Table';
import { useFetch } from '../hooks/useFetch';
import { paymentApi } from '../api/paymentApi';
import { orderApi } from '../api/orderApi';
import toast from 'react-hot-toast';

export default function Payments({ role, user, onSendNotification }) {
  const { data: pays, setData: setPays, loading, error } = useFetch(() => paymentApi.getPayments(), []);
  const { data: orders } = useFetch(() => orderApi.getOrders(), []);
  const [modal, setModal] = useState(null);
  const [amount, setAmount] = useState('');

  const visiblePays = pays;

  const totalDue = visiblePays.reduce((a, p) => a + Math.max(0, (p.total || 0) - (p.paid || 0)), 0);
  const totalPaid = visiblePays.reduce((a, p) => a + (p.paid || 0), 0);

  const recordPayment = async () => {
    if (!modal || !amount) return;
    const add = +amount;
    if (Number.isNaN(add) || add <= 0) {
      toast.error('Please enter a valid positive amount.');
      return;
    }
    const p = pays.find(x => x.id === modal);
    if (!p) return;
    const newPaid = (p.paid || 0) + add;
    const status = newPaid >= p.total ? 'paid' : newPaid > 0 ? 'partial' : p.status;
    try {
      const updated = await paymentApi.updatePayment(modal, { paid: newPaid, status });
      setPays(prev => prev.map(x => x.id === modal ? updated : x));
      onSendNotification?.({ type: 'payment', msg: `Payment of PKR ${add.toLocaleString()} recorded for ${p.shop}` });
    } catch {
      setPays(prev => prev.map(x => x.id === modal ? { ...x, paid: newPaid, status } : x));
    }
    setModal(null);
    setAmount('');
  };

  if (loading) return <PageLoader label="Loading payments..." />;

  return (
    <div className="page-enter">
      <SectionHeader title="Payments" />
      <ApiError error={error} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard icon="💰" label="Collected" value={`PKR ${totalPaid.toLocaleString()}`} color={C.success} />
        <StatCard icon="⏳" label="Outstanding" value={`PKR ${totalDue.toLocaleString()}`} color={C.warn} />
        <StatCard icon="📋" label="Accounts" value={String(visiblePays.length)} />
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <THead cols={['ID', 'Shop', 'Total', 'Paid', 'Due', 'Type', 'Status', 'Action']} />
          <tbody>
            {visiblePays.map(p => {
              const due = Math.max(0, (p.total || 0) - (p.paid || 0));
              return (
                <TRow key={p.id}>
                  <TCell bold>{p.id}</TCell>
                  <TCell>{p.shop}</TCell>
                  <TCell>PKR {(p.total || 0).toLocaleString()}</TCell>
                  <TCell>PKR {(p.paid || 0).toLocaleString()}</TCell>
                  <TCell bold color={due > 0 ? C.danger : C.success}>PKR {due.toLocaleString()}</TCell>
                  <TCell>{p.type}</TCell>
                  <TCell><Badge s={p.status} /></TCell>
                  <td style={{ padding: '8px 12px' }}>
                    {due > 0 && (
                      <button
                        onClick={() => setModal(p.id)}
                        style={{ padding: '5px 10px', background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 6, color: C.gold, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                      >
                        {role === 'shopkeeper' ? 'Pay Now' : 'Record'}
                      </button>
                    )}
                  </td>
                </TRow>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: 24, width: 320 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>{role === 'shopkeeper' ? 'Make Payment' : 'Record Payment'}</div>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Amount (PKR)"
              style={{ width: '100%', padding: 10, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 12, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={recordPayment} style={{ flex: 1, padding: 10, background: C.gold, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>{role === 'shopkeeper' ? 'Pay' : 'Save'}</button>
              <button onClick={() => { setModal(null); setAmount(''); }} style={{ flex: 1, padding: 10, border: `1px solid ${C.border}`, borderRadius: 8, background: 'transparent', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
