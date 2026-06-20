import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import crypto from 'crypto';
import { UnauthorizedError } from './errors.js';

export function generateAccessToken(payload, expiresIn = '15m') {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
}

export function generateRefreshTokenString() {
  return crypto.randomBytes(40).toString('hex');
}

export function generateTokenPair(payload) {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshTokenString(),
  };
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired. Please login again.');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token.');
    }
    throw new UnauthorizedError('Token verification failed.');
  }
}

export function decodeToken(token) {
  return jwt.decode(token);
}

export default {
  generateAccessToken,
  generateRefreshTokenString,
  generateTokenPair,
  verifyToken,
  decodeToken,
};
