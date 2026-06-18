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
import { THead, TRow, TCell } from '../components/Table';
import { PIE_COLORS } from '../config/charts';
import { api } from '../api/client';

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

const inputStyle = {
  padding: '8px 12px',
  border: `1.5px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 13,
  color: C.text,
  background: C.bg,
  outline: 'none',
};

const btnStyle = (primary, disabled) => ({
  padding: '9px 18px',
  background: disabled ? C.muted : primary ? C.gold : 'transparent',
  color: disabled ? '#fff' : primary ? '#fff' : C.gold,
  border: primary ? 'none' : `1.5px solid ${C.goldBorder}`,
  borderRadius: 8,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 13,
  fontWeight: 700,
});

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
      const res = await api.getReportsSummary({ startDate, endDate });
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
      await api.downloadReportExport({ startDate, endDate, format });
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

  if (!canAccess) {
    return (
      <div className="page-enter">
        <SectionHeader title="Reports & Analytics" />
        <div style={{ padding: 24, color: C.muted, fontSize: 14 }}>
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

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-end',
          marginBottom: 20,
          padding: 16,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6 }}>
            Start date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6 }}>
            End date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <button type="button" onClick={loadSummary} disabled={loading} style={btnStyle(true, loading)}>
          {loading ? 'Loading…' : 'Apply'}
        </button>
        <button
          type="button"
          onClick={() => handleExport('pdf')}
          disabled={!!exporting}
          style={btnStyle(false, !!exporting)}
        >
          {exporting === 'pdf' ? 'Exporting PDF…' : 'Export PDF'}
        </button>
        <button
          type="button"
          onClick={() => handleExport('excel')}
          disabled={!!exporting}
          style={btnStyle(false, !!exporting)}
        >
          {exporting === 'excel' ? 'Exporting Excel…' : 'Export Excel'}
        </button>
      </div>

      <ApiError error={error} />

      {summary && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <StatCard icon="💰" label="Revenue" value={formatPkr(summary.totalRevenue)} color={C.gold} />
            <StatCard icon="🛒" label="Orders" value={String(summary.totalOrders)} color={C.info} />
            <StatCard icon="✅" label="Collected" value={formatPkr(summary.totalPaid)} color={C.success} />
            <StatCard
              icon="📋"
              label="Outstanding"
              value={formatPkr(summary.outstandingBalance)}
              color={C.warn}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 14,
              marginBottom: 20,
            }}
          >
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>
                Revenue by week
              </div>
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
                <div style={{ fontSize: 13, color: C.muted, padding: 40, textAlign: 'center' }}>
                  No revenue data for this period.
                </div>
              )}
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>
                Orders by status
              </div>
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
                <div style={{ fontSize: 13, color: C.muted, padding: 40, textAlign: 'center' }}>
                  No orders in this period.
                </div>
              )}
            </div>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Top products (quantity sold)</div>
            </div>
            {summary.topProducts?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <THead cols={['Rank', 'Product', 'Quantity sold']} />
                <tbody>
                  {summary.topProducts.map((p, i) => (
                    <TRow key={p.productId || p.name || i}>
                      <TCell>{i + 1}</TCell>
                      <TCell bold>{p.name}</TCell>
                      <TCell>{p.quantitySold}</TCell>
                    </TRow>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 24, fontSize: 13, color: C.muted, textAlign: 'center' }}>
                No line-item sales in this period. New orders include product breakdowns for ranking.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
