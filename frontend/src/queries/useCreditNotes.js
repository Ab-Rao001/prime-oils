import { useQuery } from '@tanstack/react-query';
import { creditNoteApi } from '../api/creditNoteApi';

export function useCreditNotes(params = {}) {
  return useQuery({
    queryKey: ['credit-notes', params],
    queryFn: async () => {
      const res = await creditNoteApi.getCreditNotes(params);
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
  });
}

export function useReturnSummary() {
  return useQuery({
    queryKey: ['return-summary'],
    queryFn: () => creditNoteApi.getReturnSummary(),
    enabled: false,
  });
}
