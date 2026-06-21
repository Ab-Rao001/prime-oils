import { create } from 'zustand';

export const useNetworkStore = create((set) => ({
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  setOnline: (online) => set({ isOnline: online }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setPendingCount: (count) => set({ pendingCount: count }),
}));

// Setup event listeners
window.addEventListener('online', () => useNetworkStore.getState().setOnline(true));
window.addEventListener('offline', () => useNetworkStore.getState().setOnline(false));
