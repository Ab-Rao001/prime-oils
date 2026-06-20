import { useQuery } from '@tanstack/react-query';
import { returnApi } from '../api/returnApi';

export function useReturns(params = {}) {
  return useQuery({
    queryKey: ['returns', params],
    queryFn: async () => {
      const res = await returnApi.getReturns(params);
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useReturn(id) {
  return useQuery({
    queryKey: ['returns', id],
    queryFn: () => returnApi.getReturn(id),
    enabled: !!id,
  });
}
