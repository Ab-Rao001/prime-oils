import React, { useState } from 'react';
import C from '../theme';
import SectionHeader from '../components/SectionHeader';
import { useFetch } from '../hooks/useFetch';
import { analyticsApi } from '../api/analyticsApi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Typography } from '../components/ui';

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
        <div className="p-10 text-center text-muted-foreground">Calculating Ledger...</div>
      </div>
    );
  }

  if (error) {
    return <div className="page-enter"><div className="text-danger">Failed to load analytics</div></div>;
  }

  const { revenue, cogs, grossProfit, totalExpenses, netProfit, expenseBreakdown } = pnl;

  const pieData = Object.keys(expenseBreakdown || {}).map(k => ({
      name: k,
      value: expenseBreakdown[k]
  }));

  const COLORS = [C.primary, C.gold, C.danger, C.success, '#8884d8', '#82ca9d'];

  return (
    <div className="page-enter flex flex-col gap-6">
      <SectionHeader title="Profit & Loss Analytics" />

      <div className="flex gap-3 mb-2">
          {['all', 'month', 'week'].map(r => (
              <button 
                key={r}
                onClick={() => setDateRange(r)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  border: `1px solid ${dateRange === r ? C.gold : C.border}`,
                  backgroundColor: dateRange === r ? C.goldBg : C.card,
                  color: dateRange === r ? C.gold : C.text,
                  cursor: 'pointer',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  transition: 'all 0.2s'
                }}
              >
                  {r === 'all' ? 'All Time' : r === 'month' ? 'This Month' : 'Last 7 Days'}
              </button>
          ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className="bg-card p-5 rounded-xl border border-border dark:border-border-dark shadow-sm">
          <Typography variant="caption" className="text-muted-foreground font-semibold uppercase block mb-2">Total Revenue</Typography>
          <Typography variant="h2" size="2xl" className="text-foreground font-bold">PKR {revenue.toLocaleString()}</Typography>
        </div>
        <div className="bg-card p-5 rounded-xl border border-border dark:border-border-dark shadow-sm">
          <Typography variant="caption" className="text-muted-foreground font-semibold uppercase block mb-2">Cost of Goods Sold</Typography>
          <Typography variant="h2" size="2xl" className="text-danger font-bold">PKR {cogs.toLocaleString()}</Typography>
        </div>
        <div style={{ borderColor: C.goldBorder }} className="bg-card p-5 rounded-xl border-2 shadow-sm">
          <Typography variant="caption" style={{ color: C.gold }} className="font-semibold uppercase block mb-2">Gross Profit</Typography>
          <Typography variant="h2" size="3xl" className="text-foreground font-bold">PKR {grossProfit.toLocaleString()}</Typography>
        </div>
        <div className="bg-card p-5 rounded-xl border border-border dark:border-border-dark shadow-sm">
          <Typography variant="caption" className="text-muted-foreground font-semibold uppercase block mb-2">Operating Expenses</Typography>
          <Typography variant="h2" size="2xl" className="text-danger font-bold">PKR {totalExpenses.toLocaleString()}</Typography>
        </div>
        <div className={`bg-card p-5 rounded-xl border-2 shadow-sm ${netProfit >= 0 ? 'border-success' : 'border-danger'}`}>
          <Typography variant="caption" className={`font-bold uppercase block mb-2 ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>NET PROFIT</Typography>
          <Typography variant="h2" size="4xl" className="text-foreground font-extrabold">PKR {netProfit.toLocaleString()}</Typography>
        </div>
      </div>

      <div className="flex gap-6 flex-wrap">
          <div className="flex-[2] min-w-[400px] bg-card p-6 rounded-xl border border-border dark:border-border-dark">
              <Typography variant="h3" className="m-0 mb-5 text-foreground block">Profit Flow</Typography>
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

          <div className="flex-1 min-w-[300px] bg-card p-6 rounded-xl border border-border dark:border-border-dark">
              <Typography variant="h3" className="m-0 mb-5 text-foreground block">Expense Breakdown</Typography>
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
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">No expenses logged in this period</div>
              )}
          </div>
      </div>
    </div>
  );
}
