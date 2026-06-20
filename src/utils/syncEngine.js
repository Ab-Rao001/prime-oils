import { getPendingMutations, updateMutationStatus, removeMutation } from './db';
import { useNetworkStore } from '../store/useNetworkStore';
import { queryClient } from '../App';
import toast from 'react-hot-toast';

export const syncPendingMutations = async () => {
  const isOnline = useNetworkStore.getState().isOnline;
  if (!isOnline) return;

  const pendingMutations = await getPendingMutations();
  if (pendingMutations.length === 0) return;

  useNetworkStore.getState().setSyncing(true);
  useNetworkStore.getState().setPendingCount(pendingMutations.length);

  for (const mutation of pendingMutations) {
    try {
      await updateMutationStatus(mutation.localId, 'syncing');
      
      // Perform the actual fetch/axios call here. 
      // We will assume the payload contains { url, method, data }
      const token = document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1] || '';
      
      const res = await fetch(mutation.payload.url, {
        method: mutation.payload.method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(mutation.payload.data)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const status = res.status;
        
        // Handle Server Authority & Conflicts
        if (status === 409 || status === 400) {
           toast.error(`Sync Conflict: ${errorData.message || 'Server rejected the offline action.'}`, { duration: 6000 });
           await updateMutationStatus(mutation.localId, 'failed', errorData.message || 'Conflict');
           continue; // Skip removing so user can manually retry or delete
        }
        
        throw new Error(errorData.message || 'Sync failed');
      }

      toast.success(`Successfully synced offline action!`);
      await removeMutation(mutation.localId);

      // Invalidate relevant queries based on operationType
      if (mutation.operationType.includes('Order')) {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      } else if (mutation.operationType.includes('Payment')) {
        queryClient.invalidateQueries({ queryKey: ['payments'] });
      } else if (mutation.operationType.includes('Complaint')) {
        queryClient.invalidateQueries({ queryKey: ['complaints'] });
      }

    } catch (err) {
      console.error('Mutation sync error:', err);
      // Determine if it's a conflict or permanent error vs transient
      await updateMutationStatus(mutation.localId, 'failed', err.message);
    }
  }

  useNetworkStore.getState().setSyncing(false);
  useNetworkStore.getState().setPendingCount(0);
};

// Listen for connection restoration
window.addEventListener('online', () => {
  syncPendingMutations();
});
