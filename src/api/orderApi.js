import { request, buildUrl } from './client';

export const orderApi = {
  getOrders: params => request(buildUrl('/orders', params)),
  createOrder: body => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
  updateOrder: (orderId, body) => request(`/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateOrderStatus: (orderId, status) => request(`/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status }) })
};
