import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';

async function checkAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  const admin = await User.findOne({ email: 'admin@primeoil.com' });
  if (admin) {
    console.log('Admin found:', admin.email, 'Role:', admin.role);
    admin.password = 'password123'; // Reset password to something known
    await admin.save();
    console.log('Admin password reset to password123');
  } else {
    console.log('Admin not found!');
  }
  process.exit(0);
}
checkAdmin().catch(console.error);
