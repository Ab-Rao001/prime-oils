import '../config/env.js';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const NEW_PASS = 'Admin@123456';

await connectDB();

const hash = await bcrypt.hash(NEW_PASS, 12);
const result = await User.updateOne(
  { email: 'admin@primeoil.com' },
  {
    $set: {
      password: hash,
      failedLoginAttempts: 0,
      isLocked: false,
      lockedUntil: null,
      active: true,
      status: 'active'
    }
  }
);

console.log('Updated:', result.modifiedCount, 'document(s)');
console.log('Admin email: admin@primeoil.com');
console.log('Admin password:', NEW_PASS);
process.exit(0);
