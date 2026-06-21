import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../api/orderApi';
import toast from 'react-hot-toast';

export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (newOrder) => orderApi.createOrder(newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order created successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create order');
    }
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => orderApi.updateOrderStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const previousQueries = queryClient.getQueriesData({ queryKey: ['orders'] });

      queryClient.setQueriesData({ queryKey: ['orders'] }, (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map(order =>
          (order.id === id || order._id === id || order.orderId === id)
            ? { ...order, status }
            : order
        );
      });

      return { previousQueries };
    },
    onError: (err, _vars, context) => {
      context?.previousQueries?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error(err.message || 'Failed to update order status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
    },
    onSuccess: () => {
      toast.success('Order status updated');
    }
  });
}
