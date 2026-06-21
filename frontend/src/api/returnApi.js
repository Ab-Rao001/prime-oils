import { request, buildUrl } from './client';

export const returnApi = {
  getReturns: params => request(buildUrl('/returns', params)),
  getReturn: id => request(`/returns/${id}`),
  createReturn: body => request('/returns', { method: 'POST', body: JSON.stringify(body) }),
  inspectReturn: (id, body) => request(`/returns/${id}/inspect`, { method: 'PATCH', body: JSON.stringify(body || {}) }),
  approveReturn: (id, body) => request(`/returns/${id}/approve`, { method: 'PATCH', body: JSON.stringify(body) }),
  receiveReturn: id => request(`/returns/${id}/receive`, { method: 'PATCH', body: JSON.stringify({}) }),
  convertComplaintToReturn: (complaintId, body) =>
    request(`/complaints/${complaintId}/convert-to-return`, { method: 'POST', body: JSON.stringify(body) }),
};

export const RETURN_REASONS = [
  'Leakage',
  'Damaged packaging',
  'Expired product',
  'Wrong product',
  'Quality issue',
  'Other',
];

export const RETURN_STATUSES = [
  'REQUESTED',
  'INSPECTING',
  'APPROVED',
  'RECEIVED',
  'REJECTED',
  'COMPLETED',
];

export const RESOLUTION_TYPES = ['REFUND', 'CREDIT_NOTE', 'REPLACEMENT', 'EXCHANGE'];
