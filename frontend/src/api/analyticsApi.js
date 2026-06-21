import { request, buildUrl, API_BASE } from './client';

export const analyticsApi = {
  getPnlData: params => request(buildUrl('/analytics/pnl', params)),
  getChart: key => request(`/charts/${key}`),
  getReportsSummary: params => request(buildUrl('/reports/summary', params)),
  
  getExpenses: params => request(buildUrl('/expenses', params)),
  createExpense: body => request('/expenses', { method: 'POST', body: JSON.stringify(body) }),
  updateExpense: (id, body) => request(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteExpense: id => request(`/expenses/${id}`, { method: 'DELETE' }),

  downloadReportExport: async ({ startDate, endDate, format }) => {
    const url = `${API_BASE}${buildUrl('/reports/orders/export', { startDate, endDate, format })}`;
    const headers = {};
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { credentials: 'include', headers });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error?.message || data.message || res.statusText || 'Export failed');
    }
    const blob = await res.blob();
    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    const filename = `prime-oil-report-${startDate || 'all'}-${endDate || 'all'}.${ext}`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }
};
