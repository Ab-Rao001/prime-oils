import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

async function rename() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/prime-oil');
  const products = await Product.find({});
  for (const p of products) {
    if (p.name.toLowerCase().startsWith('canolive oil')) {
      p.name = p.name.replace(/Canolive Oil/i, '').trim();
      await p.save();
    }
  }
  console.log('Renamed products!');
  process.exit(0);
}
rename();
