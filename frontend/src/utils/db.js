import { openDB } from 'idb';

const DB_NAME = 'prime-oil-offline-db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('mutation-queue')) {
        const store = db.createObjectStore('mutation-queue', {
          keyPath: 'localId',
        });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('status', 'status');
      }
      if (!db.objectStoreNames.contains('react-query-cache')) {
        db.createObjectStore('react-query-cache');
      }
    },
  });
};

// IDB Persister for React Query
export const idbPersister = {
  persistClient: async (client) => {
    const db = await initDB();
    await db.put('react-query-cache', client, 'react-query');
  },
  restoreClient: async () => {
    const db = await initDB();
    const client = await db.get('react-query-cache', 'react-query');
    return client;
  },
  removeClient: async () => {
    const db = await initDB();
    await db.delete('react-query-cache', 'react-query');
  },
};

// Mutation Queue Operations
export const enqueueMutation = async (operationType, payload) => {
  const db = await initDB();
  const localId = crypto.randomUUID();
  const mutation = {
    localId,
    operationType,
    payload,
    timestamp: Date.now(),
    status: 'pending', // pending, syncing, completed, failed
    error: null,
  };
  await db.put('mutation-queue', mutation);
  return mutation;
};

export const getPendingMutations = async () => {
  const db = await initDB();
  const tx = db.transaction('mutation-queue', 'readonly');
  const store = tx.objectStore('mutation-queue');
  const index = store.index('timestamp');
  
  const allMutations = await index.getAll();
  return allMutations.filter(m => m.status === 'pending' || m.status === 'failed');
};

export const updateMutationStatus = async (localId, status, error = null) => {
  const db = await initDB();
  const tx = db.transaction('mutation-queue', 'readwrite');
  const store = tx.objectStore('mutation-queue');
  const mutation = await store.get(localId);
  if (mutation) {
    mutation.status = status;
    mutation.error = error;
    await store.put(mutation);
  }
  await tx.done;
};

export const removeMutation = async (localId) => {
  const db = await initDB();
  await db.delete('mutation-queue', localId);
};
