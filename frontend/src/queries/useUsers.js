import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/userApi';

export function useShopkeepers() {
  return useQuery({
    queryKey: ['shopkeepers'],
    queryFn: () => userApi.getShopkeepers(),
  });
}

export function useSalesmen() {
  return useQuery({
    queryKey: ['salesmen'],
    queryFn: () => userApi.getSalesmen(),
  });
}

export function useUsers(options = {}) {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getUsers(),
    ...options
  });
}
