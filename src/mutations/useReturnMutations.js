import { useMutation, useQueryClient } from '@tanstack/react-query';
import { returnApi } from '../api/returnApi';
import toast from 'react-hot-toast';

export function useCreateReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: body => returnApi.createReturn(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Return request submitted');
    },
    onError: err => toast.error(err.message || 'Failed to create return'),
  });
}

export function useInspectReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => returnApi.inspectReturn(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      toast.success('Inspection started');
    },
    onError: err => toast.error(err.message || 'Failed to start inspection'),
  });
}

export function useApproveReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, outcome, notes }) => returnApi.approveReturn(id, { outcome, notes }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(vars.outcome === 'APPROVED' ? 'Return approved' : 'Return rejected');
    },
    onError: err => toast.error(err.message || 'Failed to update return'),
  });
}

export function useReceiveReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: id => returnApi.receiveReturn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['return-summary'] });
      toast.success('Goods received, stock restored, and settlement posted');
    },
    onError: err => toast.error(err.message || 'Failed to receive return'),
  });
}

export function useConvertComplaintToReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ complaintId, ...body }) => returnApi.convertComplaintToReturn(complaintId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Complaint converted to return request');
    },
    onError: err => toast.error(err.message || 'Failed to convert complaint'),
  });
}
