import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './server/models/Product.js';

dotenv.config({ path: './server/.env' });

async function rename() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/prime-oil');
  const products = await Product.find({});
  for (const p of products) {
    p.name = `Canolive Oil ${p.size || p.cat}`;
    await p.save();
  }
  console.log('Renamed products!');
  process.exit(0);
}
rename();
