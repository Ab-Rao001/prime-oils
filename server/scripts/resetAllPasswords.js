/**
 * Resets ALL user passwords to known values.
 * Admin: Admin@123456
 * Others: User@123456
 * Run: node scripts/resetAllPasswords.js
 */
import '../config/env.js';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

await connectDB();

const ADMIN_PASS = 'Admin@123456';
const USER_PASS = 'User@123456';

const adminHash = await bcrypt.hash(ADMIN_PASS, 12);
const userHash = await bcrypt.hash(USER_PASS, 12);

// Reset admin
const adminResult = await User.updateMany(
  { role: 'admin' },
  { $set: { password: adminHash, failedLoginAttempts: 0, isLocked: false, lockedUntil: null, active: true, status: 'active' } }
);

// Reset all other users
const otherResult = await User.updateMany(
  { role: { $ne: 'admin' } },
  { $set: { password: userHash, failedLoginAttempts: 0, isLocked: false, lockedUntil: null, active: true, status: 'active' } }
);

// List all users
const users = await User.find({}).select('email role name').lean();

console.log('\n=== ALL USERS ===');
for (const u of users) {
  const isAdmin = u.role === 'admin';
  console.log(`  [${u.role.toUpperCase()}] ${u.email} => password: ${isAdmin ? ADMIN_PASS : USER_PASS}`);
}

console.log('\nAdmin accounts reset:', adminResult.modifiedCount);
console.log('Other accounts reset:', otherResult.modifiedCount);

await mongoose.disconnect();
process.exit(0);
