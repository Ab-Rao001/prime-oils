import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import config from '../config/env.js';
import app from '../index.js';
import User from '../models/User.js';
import errorHandler from '../middleware/errorHandler.js';
import { createTestUser } from './helpers.js';

describe('Auth Endpoints', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await createTestUser({
      name: 'Admin User',
      email: 'admin@primeoil.com',
      role: 'admin',
      status: 'active'
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully log in with a valid mock Firebase token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@primeoil.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe('admin@primeoil.com');
    });

    it('should reject login if the Firebase token is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@primeoil.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should return a validation error (400) if email/password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/email and password are required/i);
    });

    it('should reject login if user is registered but inactive', async () => {
      await User.findByIdAndUpdate(testUser._id, { status: 'inactive' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@primeoil.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/inactive or suspended/i);
    });

    it('should return 404 if the user email is not registered in the database', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unregistered@primeoil.com', password: 'password123' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should successfully refresh the access token with a valid refresh token', async () => {
      const refreshToken = jwt.sign({ id: testUser._id.toString() }, config.jwtSecret, { expiresIn: '7d' });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
    });

    it('should return 401 if refresh token is missing', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/refresh token is required/i);
    });

    it('should return 401 if refresh token is invalid or expired', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token-value' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid or expired refresh token/i);
    });

    it('should return 401 if user of refresh token no longer exists or is inactive', async () => {
      const refreshToken = jwt.sign({ id: testUser._id.toString() }, config.jwtSecret, { expiresIn: '7d' });

      // Deactivate user
      await User.findByIdAndUpdate(testUser._id, { status: 'inactive' });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid user or suspended/i);
    });
  });
});

describe('Global Error Handler Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      path: '/test-path',
      method: 'GET',
      ip: '127.0.0.1'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  it('should handle Mongoose CastError', () => {
    const error = {
      name: 'CastError',
      path: 'price',
      message: 'Cast to Number failed'
    };

    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'CAST_ERROR'
      })
    );
  });

  it('should handle Mongoose ValidationError', () => {
    const error = {
      name: 'ValidationError',
      errors: {
        name: { message: 'Name is required' },
        price: { message: 'Price must be positive' }
      }
    };

    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'VALIDATION_ERROR'
      })
    );
  });

  it('should handle MongoDB duplicate key error (code 11000)', () => {
    const error = {
      code: 11000,
      errmsg: 'E11000 duplicate key error collection: test index: email_1 dup key: { email: "test@example.com" }'
    };

    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'DUPLICATE_KEY_ERROR'
      })
    );
  });

  it('should handle ZodError', () => {
    const error = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['name'],
        message: 'Required'
      }
    ]);

    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'VALIDATION_ERROR'
      })
    );
  });

  it('should handle generic errors by returning 500 Internal Server Error', () => {
    const error = new Error('Generic database error');

    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again later.'
      })
    );
  });
});
