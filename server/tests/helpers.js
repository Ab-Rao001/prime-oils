import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import User from '../models/User.js';

export const getAuthToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
};

export const createTestUser = async ({
  name = 'Test User',
  email = 'test@example.com',
  role = 'shopkeeper',
  status = 'active',
} = {}) => {
  return await User.create({
    name,
    email,
    password: 'password123',
    role,
    status,
  });
};
