import mongoose from 'mongoose';
import User from './models/User.js';
import config from './config/env.js';

async function run() {
  await mongoose.connect(config.mongodbUri);
  console.log('Connected to MongoDB');
  const result = await User.deleteMany({ email: { $ne: process.env.SUPER_ADMIN_EMAIL || 'admin@primeoil.com' } });
  console.log(`Deleted ${result.deletedCount} non-admin users.`);
  await mongoose.disconnect();
}

run().catch(console.error);
