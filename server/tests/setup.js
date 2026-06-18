import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.MONGOMS_MD5_CHECK = '0';
process.env.MONGOMS_VERSION = '4.4.29';

if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.trim().length < 32 ||
  ['default_secret', 'secret'].includes(process.env.JWT_SECRET.trim())
) {
  process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters-long';
}
import { jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Register every Mongoose model so connection.collections is complete for beforeEach cleanup
import '../models/User.js';
import '../models/Product.js';
import '../models/Shopkeeper.js';
import '../models/Order.js';
import '../models/Payment.js';
import '../models/Complaint.js';
import '../models/Campaign.js';
import '../models/Notification.js';
import '../models/ChartData.js';


let mongoServer;

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
}, 120_000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
