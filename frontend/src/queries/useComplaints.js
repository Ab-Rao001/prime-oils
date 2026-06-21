import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/userApi';

export function useComplaints(params = {}) {
  return useQuery({
    queryKey: ['complaints', params],
    queryFn: async () => {
      const res = await userApi.getComplaints(params);
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
    staleTime: 0,
  });
}
