import React, { useState, useEffect } from 'react';
import C from '../theme';
import SectionHeader from '../components/SectionHeader';
import { useFetch } from '../hooks/useFetch';
import { analyticsApi } from '../api/analyticsApi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

export default function CashFlow({ role }) {
  const [dateRange, setDateRange] = useState('all');
  
  // Build query params based on selected range
  const getParams = () => {
    const params = {};
    if (dateRange === 'month') {
        const d = new Date();
        d.setDate(1); // Start of month
        params.startDate = d.toISOString();
    } else if (dateRange === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.startDate = d.toISOString();
    }
    return params;
  };

  const { data: pnl, loading, error } = useFetch(() => analyticsApi.getPnlData(getParams()), [dateRange]);

  if (loading || !pnl) {
    return (
      <div className="page-enter">
        <SectionHeader title="Profit & Loss Analytics" />
        <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Calculating Ledger...</div>
      </div>
    );
  }

  if (error) {
    return <div className="page-enter"><div style={{color: C.danger}}>Failed to load analytics</div></div>;
  }

  const { revenue, cogs, grossProfit, totalExpenses, netProfit, expenseBreakdown } = pnl;

  const pieData = Object.keys(expenseBreakdown || {}).map(k => ({
      name: k,
      value: expenseBreakdown[k]
  }));

  const COLORS = [C.primary, C.gold, C.danger, C.success, '#8884d8', '#82ca9d'];

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader title="Profit & Loss Analytics" />

      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          {['all', 'month', 'week'].map(r => (
              <button 
                key={r}
                onClick={() => setDateRange(r)}
                style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    border: `1px solid ${dateRange === r ? C.primary : C.border}`,
                    background: dateRange === r ? `${C.primary}22` : C.card,
                    color: dateRange === r ? C.primary : C.text,
                    cursor: 'pointer',
                    fontWeight: 600,
                    textTransform: 'capitalize'
                }}
              >
                  {r === 'all' ? 'All Time' : r === 'month' ? 'This Month' : 'Last 7 Days'}
              </button>
          ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div style={{ background: C.card, padding: 20, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 13, color: C.muted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Total Revenue</div>
          <div style={{ fontSize: 24, color: C.text, fontWeight: 700 }}>PKR {revenue.toLocaleString()}</div>
        </div>
        <div style={{ background: C.card, padding: 20, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 13, color: C.muted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Cost of Goods Sold</div>
          <div style={{ fontSize: 24, color: C.danger, fontWeight: 700 }}>PKR {cogs.toLocaleString()}</div>
        </div>
        <div style={{ background: C.card, padding: 20, borderRadius: 12, border: `1.5px solid ${C.primary}`, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 13, color: C.primary, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Gross Profit</div>
          <div style={{ fontSize: 28, color: C.text, fontWeight: 700 }}>PKR {grossProfit.toLocaleString()}</div>
        </div>
        <div style={{ background: C.card, padding: 20, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 13, color: C.muted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Operating Expenses</div>
          <div style={{ fontSize: 24, color: C.danger, fontWeight: 700 }}>PKR {totalExpenses.toLocaleString()}</div>
        </div>
        <div style={{ background: C.card, padding: 20, borderRadius: 12, border: `2px solid ${netProfit >= 0 ? C.success : C.danger}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 13, color: netProfit >= 0 ? C.success : C.danger, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>NET PROFIT</div>
          <div style={{ fontSize: 32, color: C.text, fontWeight: 800 }}>PKR {netProfit.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 400, background: C.card, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: 16, color: C.text }}>Profit Flow</h3>
              <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                      { name: 'Revenue', value: revenue, fill: C.primary },
                      { name: 'COGS', value: cogs, fill: C.danger },
                      { name: 'Gross', value: grossProfit, fill: C.success },
                      { name: 'Expenses', value: totalExpenses, fill: C.gold },
                      { name: 'Net', value: netProfit, fill: netProfit >= 0 ? C.success : C.danger }
                  ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.border} />
                      <XAxis dataKey="name" stroke={C.muted} fontSize={12} />
                      <YAxis stroke={C.muted} fontSize={12} tickFormatter={val => `PKR ${(val/1000)}k`} />
                      <Tooltip formatter={(val) => `PKR ${val.toLocaleString()}`} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {
                              [0, 1, 2, 3, 4].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={[C.primary, C.danger, C.success, C.gold, netProfit >= 0 ? C.success : C.danger][index]} />
                              ))
                          }
                      </Bar>
                  </BarChart>
              </ResponsiveContainer>
          </div>

          <div style={{ flex: 1, minWidth: 300, background: C.card, padding: 24, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: 16, color: C.text }}>Expense Breakdown</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(val) => `PKR ${val.toLocaleString()}`} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
              ) : (
                  <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>No expenses logged in this period</div>
              )}
          </div>
      </div>
    </div>
  );
}
