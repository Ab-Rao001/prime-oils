import React, { useState } from 'react';
import C from '../theme';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import { THead, TRow, TCell } from '../components/Table';
import { PAYMENTS, ORDERS } from '../data/mockData';

export default function Payments({ role, user, onSendNotification }) {
  const [pays,  setPays]  = useState(PAYMENTS);
  const [modal, setModal] = useState(null);
  const [amount, setAmount] = useState('');

  const firstName = String(user?.name || '').split(' ')[0].trim();
  const salesmanShops = new Set(ORDERS.filter(o => o.man === firstName).map(o => o.shop));

  const visiblePays = (() => {
    if (role === 'admin') return pays;
    if (role === 'shopkeeper') return pays.filter(p => p.shop === user?.name);
    if (role === 'salesman') return pays.filter(p => salesmanShops.has(p.shop));
    return pays;
  })();

  const totalColl = visiblePays.reduce((a, p) => a + p.paid, 0);
  const totalPend = visiblePays.reduce((a, p) => a + (p.total - p.paid), 0);

  const collectPayment = (id, amt) => {
    setPays(pays.map(p =>
      p.id === id
        ? { ...p, paid: Math.min(p.total, p.paid + amt), status: p.paid + amt >= p.total ? 'paid' : 'partial' }
        : p
    ));
    setModal(null);
  };

  return (
    <div className="page-enter">
      <SectionHeader title="Payment & Installment Management" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon="✅" label="Collected"         value={`PKR ${(totalColl / 1000).toFixed(0)}K`} color={C.success} />
        <StatCard icon="⏳" label="Pending"           value={`PKR ${(totalPend / 1000).toFixed(0)}K`} color={C.warn}    />
        <StatCard icon="🚨" label="Overdue Accounts"  value={visiblePays.filter(p => p.status === 'overdue').length}  color={C.danger} />
        <StatCard icon="📋" label="Installment Plans" value={visiblePays.filter(p => p.type === 'installment').length} color={C.info}  />
      </div>

      {/* Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <THead cols={['ID', 'Shopkeeper', 'Total', 'Paid', 'Pending', 'Type', 'Next Due', 'Status', 'Action']} />
          <tbody>
            {visiblePays.map(p => (
              <TRow key={p.id}>
                <TCell bold>{p.id}</TCell>
                <TCell>{p.shop}</TCell>
                <TCell>PKR {p.total.toLocaleString()}</TCell>
                <TCell bold>PKR {p.paid.toLocaleString()}</TCell>
                <td style={{ padding: '10px 12px', fontSize: 13, color: p.total - p.paid > 0 ? C.danger : C.success, fontWeight: 700 }}>
                  PKR {(p.total - p.paid).toLocaleString()}
                </td>
                <TCell><Badge s={p.type} /></TCell>
                <TCell>{p.due || '—'}</TCell>
                <TCell><Badge s={p.status} /></TCell>
                <td style={{ padding: '8px 12px' }}>
                  {p.total > p.paid && (
                    <button
                      onClick={() => { setModal(p); setAmount(String(p.total - p.paid)); }}
                      style={{ padding: '4px 11px', background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 6, color: C.gold, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                    >
                      Collect
                    </button>
                  )}
                  {role === 'admin' && (p.status === 'pending' || p.status === 'overdue') && (
                    <button
                      onClick={() => onSendNotification?.({
                        type: 'payment',
                        msg: `${p.shop} payment ${p.status} – PKR ${(p.total - p.paid).toLocaleString()} due`,
                      })}
                      style={{ marginLeft: 8, padding: '4px 10px', background: '#111', border: `1px solid ${C.goldBorder}`, borderRadius: 6, color: '#F5C842', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                    >
                      Send Notification
                    </button>
                  )}
                </td>
              </TRow>
            ))}
          </tbody>
        </table>
      </div>

      {/* Progress bars */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>Installment Progress</div>
        {visiblePays.filter(p => p.type === 'installment').map(p => {
          const pct = Math.round((p.paid / p.total) * 100);
          return (
            <div key={p.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{p.shop}</span>
                <span style={{ fontSize: 11, color: C.muted }}>PKR {p.paid.toLocaleString()} / {p.total.toLocaleString()} ({pct}%)</span>
              </div>
              <div style={{ height: 7, borderRadius: 4, background: C.bg, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct < 40 ? C.danger : pct < 70 ? C.warn : C.success, borderRadius: 4, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.card, borderRadius: 16, padding: 26, width: 320, boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Record Payment</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
              {modal.shop} — Pending: PKR {(modal.total - modal.paid).toLocaleString()}
            </div>
            <label style={{ display: 'block', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Amount (PKR)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ width: '100%', padding: '9px 11px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, marginBottom: 14, boxSizing: 'border-box', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => collectPayment(modal.id, +amount)} style={{ flex: 1, padding: '9px', background: C.gold, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Confirm</button>
              <button onClick={() => setModal(null)} style={{ padding: '9px 14px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.muted }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
