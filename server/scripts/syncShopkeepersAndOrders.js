import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Shopkeeper from '../models/Shopkeeper.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'prime_oils' });
    console.log('Connected to DB');

    // 1. Backfill Order paymentStatus and paidAmount
    const orders = await Order.find({});
    for (const order of orders) {
      const payments = await Payment.find({ order: order._id });
      const totalPaid = payments.reduce((sum, p) => sum + (p.paid || 0), 0);
      
      let status = 'pending';
      if (totalPaid >= order.total) {
        status = 'paid';
      } else if (totalPaid > 0) {
        status = 'partial';
      }

      order.paymentStatus = status;
      order.paidAmount = totalPaid;
      await order.save();
    }
    console.log(`Updated ${orders.length} orders with payment statuses`);

    // 2. Fix duplicate Shopkeepers
    // Group shopkeepers by owner
    const shopsByOwner = await Shopkeeper.aggregate([
      { $group: { _id: '$owner', shops: { $push: '$$ROOT' } } }
    ]);

    let mergedCount = 0;
    for (const group of shopsByOwner) {
      if (group.shops.length > 1) {
        // We have duplicates for this owner
        // Prefer the one with 'Store' in the name, or the one that has location/contact
        const mainShop = group.shops.find(s => s.name.includes('Store')) || group.shops[0];
        const otherShops = group.shops.filter(s => s._id.toString() !== mainShop._id.toString());

        for (const duplicate of otherShops) {
          console.log(`Merging duplicate shop '${duplicate.name}' into '${mainShop.name}'`);
          // Reassign Orders
          await Order.updateMany({ shop: duplicate._id }, { shop: mainShop._id });
          // Reassign Payments
          await Payment.updateMany({ shop: duplicate._id }, { shop: mainShop._id });
          // Delete duplicate
          await Shopkeeper.findByIdAndDelete(duplicate._id);
          mergedCount++;
        }
      }
    }
    console.log(`Merged ${mergedCount} duplicate shopkeepers`);

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
