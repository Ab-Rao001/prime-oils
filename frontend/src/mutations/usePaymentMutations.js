import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '../api/paymentApi';
import toast from 'react-hot-toast';

export function usePayOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, amount }) => paymentApi.payOrder({ orderId, amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment recorded successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to record payment');
    }
  });
}
