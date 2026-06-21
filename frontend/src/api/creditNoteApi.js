import { request, buildUrl } from './client';

export const creditNoteApi = {
  getCreditNotes: params => request(buildUrl('/credit-notes', params)),
  getCreditNote: id => request(`/credit-notes/${id}`),
  getRefunds: () => request('/credit-notes/refunds'),
  getReturnSummary: () => request('/credit-notes/summary'),
};
