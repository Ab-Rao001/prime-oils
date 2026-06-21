import { request, buildUrl } from './client';

export const paymentApi = {
  getPayments: params => request(buildUrl('/payments', params)),
  updatePayment: (paymentId, body) => request(`/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  payOrder: body => request('/payments/pay-order', { method: 'POST', body: JSON.stringify(body) }),
  getTransactions: params => request(buildUrl('/transactions', params))
};
