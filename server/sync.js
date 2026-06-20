import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve('./.env') });
import mongoose from 'mongoose';
import User from './models/User.js';
import Shopkeeper from './models/Shopkeeper.js';

async function sync() {
  console.log(process.env.MONGODB_URI);
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({ role: 'shopkeeper' });
  let c=0;
  for (const u of users) {
    const s = await Shopkeeper.findOne({ $or: [{ owner: u.name }, { email: u.email }] });
    if (s && !s.userId) {
      s.userId = u._id;
      s.email = u.email;
      s.phone = u.phone;
      s.loc = u.address;
      await s.save();
      c++;
    }
  }
  console.log('Synced', c, 'orphans');
  process.exit(0);
}
sync().catch(console.error);
