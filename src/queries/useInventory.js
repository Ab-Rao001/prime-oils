import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await inventoryApi.getProducts();
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
  });
}
