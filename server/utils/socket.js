import { Server } from 'socket.io';
import socketAuth from '../middleware/socketAuth.js';
import logger from './logger.js';

let io;

export const initIO = (httpServer, allowedOrigins) => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Apply authentication middleware
  io.use(socketAuth);

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.user?.id}, Role: ${socket.user?.role})`);

    // Join user-specific room
    if (socket.user?.id) {
      socket.join(`user_${socket.user.id}`);
    }

    // Join role-specific room
    if (socket.user?.role) {
      socket.join(`role_${socket.user.role}`);
    }

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
