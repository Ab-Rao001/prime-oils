export default {
  testEnvironment: 'node',
  testTimeout: 30_000,
  setupFilesAfterEnv: ['./tests/setup.js'],
  collectCoverageFrom: [
    'routes/auth.js',
    'routes/orders.js',
    'routes/payments.js',
    'middleware/auth.js',
    'middleware/authorize.js',
    'middleware/errorHandler.js',
    'middleware/validate.js',
    'utils/AppError.js',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  transform: {},
};
