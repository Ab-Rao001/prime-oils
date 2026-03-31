import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import C from '../theme';
import StatCard from '../components/StatCard';
import SectionHeader from '../components/SectionHeader';
import Badge from '../components/Badge';
import { THead, TRow, TCell } from '../components/Table';
import { SALES_CHART, CATEGORY_CHART, PIE_COLORS } from '../data/mockData';

const SUMMARY = [
  ['Total Orders',        '6',            '+20%',  'active'     ],
  ['Revenue',             'PKR 4,45,000', '+11%',  'active'     ],
  ['Pending Payments',    'PKR 83,267',   '-5%',   'pending'    ],
  ['Complaints',          '4',            '+33%',  'overdue'    ],
  ['Resolved Complaints', '1',            '25%',   'pending'    ],
  ['Marketing Spend',     'PKR 38,000',   'Active','processing' ],
];

export default function Reports() {
  return (
    <div className="page-enter">
      <SectionHeader title="Reports & Analytics" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard icon="📊" label="Mar Revenue"              value="PKR 4.45L" sub="+11% vs target" color={C.gold}    />
        <StatCard icon="✅" label="Orders Delivered"          value="2 / 6"                         color={C.success} />
        <StatCard icon="💳" label="Collections Rate"          value="74%"                           color={C.info}    />
        <StatCard icon="⭐" label="Shopkeeper Satisfaction"  value="4.1 / 5"                       color={C.warn}    />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: 14, marginBottom: 14 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>Monthly Sales Trend (PKR 000s)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={SALES_CHART}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: C.muted }} />
              <YAxis tick={{ fontSize: 11, fill: C.muted }} />
              <Tooltip />
              <Line type="monotone" dataKey="sales"  stroke={C.gold}   strokeWidth={2.5} dot={{ fill: C.gold, r: 4 }} name="Sales"  />
              <Line type="monotone" dataKey="target" stroke={C.border} strokeWidth={2}   strokeDasharray="5 5" dot={false}         name="Target" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>Product Mix</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={CATEGORY_CHART} dataKey="v" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={3}>
                {CATEGORY_CHART.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'auto' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 600, color: C.text }}>
          March 2025 Summary Report
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <THead cols={['Metric', 'Value', 'Change', 'Status']} />
          <tbody>
            {SUMMARY.map(([m, v, ch, s]) => (
              <TRow key={m}>
                <TCell bold>{m}</TCell>
                <TCell>{v}</TCell>
                <TCell>{ch}</TCell>
                <TCell><Badge s={s} /></TCell>
              </TRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
