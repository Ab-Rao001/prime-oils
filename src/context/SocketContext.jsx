import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect to Socket.io Server
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5005', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to real-time events');
    });

    newSocket.on('notification', (payload) => {
      console.log('Real-time notification received:', payload);
      
      // Emit a global DOM event for the notification center to update its unread count
      window.dispatchEvent(new CustomEvent('new-notification', { detail: payload }));
      
      // Show toast
      if (payload.priority === 'CRITICAL') {
        toast.error(payload.message || payload.msg, { duration: 6000 });
      } else {
        toast(payload.message || payload.msg, {
          icon: payload.type === 'DELIVERY' ? '🚚' : payload.type === 'ORDER' ? '📦' : payload.type === 'PAYMENT' ? '💰' : '🔔',
          duration: 4000
        });
      }
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
