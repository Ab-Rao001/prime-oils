import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import C from '../theme';
import StatCard from '../components/StatCard';
import SectionHeader from '../components/SectionHeader';
import { THead, TRow, TCell } from '../components/Table';
import { CASH_CHART } from '../data/mockData';

export default function CashFlow() {
  return (
    <div className="page-enter">
      <SectionHeader title="Cash Flow Management" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon="📈" label="Mar Inflow"         value="PKR 262K"  color={C.success} />
        <StatCard icon="📉" label="Mar Outflow"        value="PKR 170K"  color={C.danger}  />
        <StatCard icon="💎" label="Net Profit"         value="PKR 92K"   color={C.gold}    />
        <StatCard icon="🕐" label="Today's Collection" value="PKR 21.6K" color={C.info}    />
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>Daily Cash Flow (PKR)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={CASH_CHART} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="d" tick={{ fontSize: 11, fill: C.muted }} />
            <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v, n) => [`PKR ${v.toLocaleString()}`, n]} />
            <Bar dataKey="i" fill={C.gold}   radius={[4,4,0,0]} name="Inflow"  />
            <Bar dataKey="o" fill="#E6DECE" radius={[4,4,0,0]} name="Outflow" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <THead cols={['Date', 'Inflow', 'Outflow', 'Net']} />
          <tbody>
            {CASH_CHART.map(d => (
              <TRow key={d.d}>
                <TCell bold>{d.d}</TCell>
                <td style={{ padding: '10px 12px', fontSize: 13, color: C.success, fontWeight: 600 }}>+PKR {d.i.toLocaleString()}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: C.danger,  fontWeight: 600 }}>-PKR {d.o.toLocaleString()}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: d.i - d.o > 0 ? C.success : C.danger, fontWeight: 700 }}>
                  PKR {(d.i - d.o).toLocaleString()}
                </td>
              </TRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
