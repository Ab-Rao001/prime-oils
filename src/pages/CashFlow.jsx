import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import C from '../theme';
import StatCard from '../components/StatCard';
import SectionHeader from '../components/SectionHeader';
import PageLoader from '../components/PageLoader';
import { ApiError } from '../components/ApiMessage';
import { THead, TRow, TCell } from '../components/Table';
import { useFetch } from '../hooks/useFetch';
import { api } from '../api/client';

export default function CashFlow() {
  const { data: cashChart, loading, error } = useFetch(() => api.getChart('cash'), []);

  const totalIn = cashChart.reduce((a, d) => a + (d.i || 0), 0);
  const totalOut = cashChart.reduce((a, d) => a + (d.o || 0), 0);

  if (loading) return <PageLoader label="Loading cash flow..." />;

  return (
    <div className="page-enter">
      <SectionHeader title="Cash Flow Management" />
      <ApiError error={error} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon="📈" label="Period Inflow" value={`PKR ${(totalIn / 1000).toFixed(0)}K`} color={C.success} />
        <StatCard icon="📉" label="Period Outflow" value={`PKR ${(totalOut / 1000).toFixed(0)}K`} color={C.danger} />
        <StatCard icon="💎" label="Net" value={`PKR ${((totalIn - totalOut) / 1000).toFixed(0)}K`} color={C.gold} />
      </div>

      {cashChart.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>Daily Cash Flow (PKR)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cashChart} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="d" tick={{ fontSize: 11, fill: C.muted }} />
              <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v, n) => [`PKR ${Number(v).toLocaleString()}`, n]} />
              <Bar dataKey="i" fill={C.gold} radius={[4, 4, 0, 0]} name="Inflow" />
              <Bar dataKey="o" fill="#E6DECE" radius={[4, 4, 0, 0]} name="Outflow" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {cashChart.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <THead cols={['Date', 'Inflow', 'Outflow', 'Net']} />
            <tbody>
              {cashChart.map(d => (
                <TRow key={d.d}>
                  <TCell>{d.d}</TCell>
                  <TCell color={C.success}>PKR {(d.i || 0).toLocaleString()}</TCell>
                  <TCell color={C.danger}>PKR {(d.o || 0).toLocaleString()}</TCell>
                  <TCell bold>PKR {((d.i || 0) - (d.o || 0)).toLocaleString()}</TCell>
                </TRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
