import React, { useState, useEffect } from 'react';
import { useNetworkStore } from '../store/useNetworkStore';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { getPendingMutations, removeMutation } from '../utils/db';
import { syncPendingMutations } from '../utils/syncEngine';

export const NetworkIndicator = () => {
  const { isOnline, isSyncing, pendingCount } = useNetworkStore();
  const [showModal, setShowModal] = useState(false);
  const [mutations, setMutations] = useState([]);

  useEffect(() => {
    if (showModal) {
      getPendingMutations().then(setMutations);
    }
  }, [showModal, isSyncing]);

  const handleRetry = async () => {
    setShowModal(false);
    await syncPendingMutations();
  };

  const handleClear = async (id) => {
    await removeMutation(id);
    getPendingMutations().then(setMutations);
    useNetworkStore.getState().setPendingCount(mutations.length - 1);
  };

  if (!isOnline) {
    return (
      <div className="bg-red-500 text-white px-4 py-2 text-sm flex items-center justify-center gap-2 font-medium z-50">
        <WifiOff size={16} />
        <span>Offline Mode - Changes will sync automatically</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="bg-blue-500 text-white px-4 py-2 text-sm flex items-center justify-center gap-2 font-medium z-50">
        <RefreshCw size={16} className="animate-spin" />
        <span>Syncing {pendingCount} pending actions</span>
      </div>
    );
  }

  return (
    <>
      <div 
        onClick={() => pendingCount > 0 && setShowModal(true)}
        className={`bg-green-500 text-white px-4 py-2 text-sm flex items-center justify-center gap-2 font-medium z-50 transition-opacity duration-1000 ${pendingCount > 0 ? 'opacity-100 cursor-pointer bg-yellow-500' : 'opacity-0 pointer-events-none'} absolute w-full top-0`}
      >
        {pendingCount > 0 ? <AlertCircle size={16} /> : <Wifi size={16} />}
        <span>{pendingCount > 0 ? `${pendingCount} failed/pending actions (Click to view)` : 'Connected'}</span>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Offline Sync Queue</h2>
            <div className="max-h-60 overflow-y-auto mb-4 space-y-3">
              {mutations.length === 0 && <p className="text-slate-500 text-sm">No pending actions.</p>}
              {mutations.map(m => (
                <div key={m.localId} className="p-3 border rounded-lg dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{m.operationType}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                      {m.status}
                    </span>
                  </div>
                  {m.error && <p className="text-xs text-red-500 mt-1">{m.error}</p>}
                  <button onClick={() => handleClear(m.localId)} className="text-xs text-red-500 hover:underline mt-2">Delete Action</button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Close</button>
              <button onClick={handleRetry} disabled={!isOnline} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">Retry All</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
