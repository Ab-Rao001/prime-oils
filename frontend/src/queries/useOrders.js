import { useQuery } from '@tanstack/react-query';
import { orderApi } from '../api/orderApi';

export function useOrders(params = {}) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const res = await orderApi.getOrders(params);
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}
