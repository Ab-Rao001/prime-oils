import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import User from '../models/User.js';

const socketAuth = async (socket, next) => {
  try {
    // We expect the token either in handshake auth or cookies
    const token = socket.handshake.auth?.token || parseCookie(socket.handshake.headers.cookie, 'token');
    
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || user.isDeleted || user.status === 'inactive') {
      return next(new Error('Authentication error: User inactive or deleted'));
    }

    // Attach user to socket object
    socket.user = {
      id: user._id.toString(),
      role: user.role
    };
    
    next();
  } catch (err) {
    next(new Error(`Authentication error: ${err.message}`));
  }
};

function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return match[2];
  return null;
}

export default socketAuth;
