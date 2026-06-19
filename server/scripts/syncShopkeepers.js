import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.js';
import Shopkeeper from '../models/Shopkeeper.js';

async function syncShopkeepers() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/prime-oil';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const users = await User.find({ role: 'shopkeeper' });
    console.log(`Found ${users.length} shopkeeper users.`);

    let created = 0;
    for (const user of users) {
      const existing = await Shopkeeper.findOne({ owner: user.name });
      if (!existing) {
        await Shopkeeper.create({
          name: user.name + " Store",
          owner: user.name,
          phone: user.phone || '0000000000',
          loc: "Pending",
          status: 'active'
        });
        created++;
        console.log(`Created shopkeeper profile for ${user.name}`);
      }
    }

    console.log(`Sync complete. Created ${created} new shopkeeper profiles.`);
    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

syncShopkeepers();
