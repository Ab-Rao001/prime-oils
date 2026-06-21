import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { useNotificationStore } from '../store';
import { useQueryClient } from '@tanstack/react-query';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();
  const addNotification = useNotificationStore(state => state.addNotification);
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // We use empty string so socket.io connects to the same host/port the browser is on,
    // allowing the CRA proxy to forward it via setupProxy.js and preserving cookies.
    const socketUrl = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '').replace(/\/+$/, '') : '';
    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to real-time events');
    });

    // Handle generic notifications
    newSocket.on('notification', (payload) => {
      addNotification(payload);
      
      if (payload.priority === 'CRITICAL') {
        toast.error(payload.message || payload.msg, { duration: 6000 });
      } else {
        toast(payload.message || payload.msg, {
          icon: payload.type === 'DELIVERY' ? '🚚' : payload.type === 'ORDER' ? '📦' : payload.type === 'PAYMENT' ? '💰' : '🔔',
          duration: 4000
        });
      }
    });

    // Specific Domain Events
    newSocket.on('NEW_ORDER', (payload) => {
      addNotification({ ...payload, type: 'ORDER' });
      qc.invalidateQueries({ queryKey: ['orders'] });
    });

    newSocket.on('ORDER_APPROVED', (payload) => {
      addNotification({ ...payload, type: 'ORDER' });
      qc.invalidateQueries({ queryKey: ['orders'] });
    });

    newSocket.on('ORDER_STATUS_CHANGED', () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dispatches'] });
    });

    newSocket.on('DISPATCH_UPDATE', () => {
      qc.invalidateQueries({ queryKey: ['dispatches'] });
    });

    newSocket.on('RETURN_STATUS_CHANGED', () => {
      qc.invalidateQueries({ queryKey: ['returns'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['complaints'] });
      qc.invalidateQueries({ queryKey: ['return-summary'] });
    });

    newSocket.on('CREDIT_NOTE_POSTED', () => {
      qc.invalidateQueries({ queryKey: ['credit-notes'] });
      qc.invalidateQueries({ queryKey: ['returns'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['return-summary'] });
    });

    newSocket.on('STOCK_CHANGED', () => {
      qc.invalidateQueries({ queryKey: ['products'] });
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [user, addNotification, qc]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
