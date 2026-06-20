import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import C from '../theme';
import StatCard from '../components/StatCard';
import SectionHeader from '../components/SectionHeader';
import PageLoader from '../components/PageLoader';
import { ApiError } from '../components/ApiMessage';
import DataGrid from '../components/DataGrid';
import { Typography, Button, Input } from '../components/ui';
import { PIE_COLORS } from '../config/charts';
import { analyticsApi } from '../api/analyticsApi';

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
}

function formatPkr(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `PKR ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `PKR ${(n / 1_000).toFixed(1)}K`;
  return `PKR ${n.toLocaleString('en-PK')}`;
}

export default function Reports({ role }) {
  const defaults = useMemo(() => getDefaultDateRange(), []);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(null);

  const canAccess = ['admin', 'salesman', 'shopkeeper'].includes(role);

  const loadSummary = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getReportsSummary({ startDate, endDate });
      setSummary(res.data);
    } catch (e) {
      setError(e.message || 'Failed to load reports');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, canAccess]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleExport = async format => {
    setExporting(format);
    setError(null);
    try {
      await analyticsApi.downloadReportExport({ startDate, endDate, format });
    } catch (e) {
      setError(e.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const statusChartData = useMemo(
    () =>
      (summary?.ordersByStatus || []).map(row => ({
        name: row.status,
        value: row.count,
      })),
    [summary]
  );

  const topProductsColumns = useMemo(() => [
    { header: 'Rank', accessorKey: 'rank', cell: (p, index) => index + 1 },
    { header: 'Product', accessorKey: 'name', sortable: true, cell: (p) => <Typography variant="body" weight="semibold">{p.name}</Typography> },
    { header: 'Quantity sold', accessorKey: 'quantitySold', sortable: true }
  ], []);

  if (!canAccess) {
    return (
      <div className="page-enter">
        <SectionHeader title="Reports & Analytics" />
        <div className="p-6 text-muted-foreground text-sm">
          Your role does not have access to reports.
        </div>
      </div>
    );
  }

  if (loading && !summary) {
    return <PageLoader label="Loading reports..." />;
  }

  return (
    <div className="page-enter">
      <SectionHeader title="Reports & Analytics" />

      <div className="flex flex-wrap gap-3 items-end mb-5 p-4 bg-card border border-border dark:border-border-dark rounded-xl">
        <div className="flex-1 min-w-[150px]">
          <Input
            type="date"
            label="Start date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <Input
            type="date"
            label="End date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
        <Button onClick={loadSummary} disabled={loading} isLoading={loading}>
          {loading ? 'Loading…' : 'Apply'}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('pdf')}
          disabled={!!exporting}
          isLoading={exporting === 'pdf'}
        >
          {exporting === 'pdf' ? 'Exporting PDF…' : 'Export PDF'}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('excel')}
          disabled={!!exporting}
          isLoading={exporting === 'excel'}
        >
          {exporting === 'excel' ? 'Exporting Excel…' : 'Export Excel'}
        </Button>
      </div>

      <ApiError error={error} />

      {summary && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 mb-5">
            <StatCard icon="💰" label={role === 'shopkeeper' ? 'Total Spend' : 'Revenue'} value={formatPkr(summary.totalRevenue)} colorClass="text-gold bg-gold/15" />
            <StatCard icon="🛒" label="Orders" value={String(summary.totalOrders)} colorClass="text-info bg-info/15" />
            <StatCard
              icon="✅"
              label={role === 'salesman' ? 'Period Collection' : role === 'shopkeeper' ? 'Total Paid' : 'Collected'}
              value={formatPkr(summary.totalPaid)}
              colorClass="text-success bg-success/15"
            />
            <StatCard
              icon="📋"
              label={role === 'salesman' ? 'Amount Due in Market' : role === 'shopkeeper' ? 'Amount Due' : 'Outstanding'}
              value={formatPkr(summary.outstandingBalance)}
              colorClass="text-warn bg-warn/15"
            />
            {role === 'admin' && (
              <>
                <StatCard icon="💸" label="Spendings" value={formatPkr(summary.totalExpenses || 0)} colorClass="text-danger bg-danger/15" />
                <StatCard icon="📈" label="Net Profit" value={formatPkr(summary.netProfit || 0)} colorClass="text-success bg-success/15" />
              </>
            )}
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5 mb-5 max-md:grid-cols-1">
            <div className="bg-card border border-border dark:border-border-dark rounded-xl p-4.5">
              <Typography variant="body" weight="semibold" className="text-foreground mb-3.5 block">
                {role === 'shopkeeper' ? 'Spend by week' : 'Revenue by week'}
              </Typography>
              {summary.revenueByWeek?.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={summary.revenueByWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} />
                    <YAxis tick={{ fontSize: 11, fill: C.muted }} />
                    <Tooltip formatter={v => [formatPkr(v), 'Revenue']} />
                    <Bar dataKey="revenue" fill={C.gold} radius={[6, 6, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-[13px] text-muted-foreground p-10 text-center">
                  No revenue data for this period.
                </div>
              )}
            </div>

            <div className="bg-card border border-border dark:border-border-dark rounded-xl p-4.5">
              <Typography variant="body" weight="semibold" className="text-foreground mb-3.5 block">
                Orders by status
              </Typography>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {statusChartData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-[13px] text-muted-foreground p-10 text-center">
                  No orders in this period.
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border dark:border-border-dark rounded-xl overflow-hidden">
            <div className="py-4 px-4.5 border-b border-border dark:border-border-dark">
              <Typography variant="body" weight="semibold" className="text-foreground block">Top products (quantity sold)</Typography>
            </div>
            {summary.topProducts?.length > 0 ? (
              <DataGrid 
                columns={topProductsColumns}
                data={summary.topProducts}
                emptyMessage="No line-item sales in this period. New orders include product breakdowns for ranking."
                selectable={false}
              />
            ) : (
              <div className="p-6 text-[13px] text-muted-foreground text-center">
                No line-item sales in this period. New orders include product breakdowns for ranking.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
