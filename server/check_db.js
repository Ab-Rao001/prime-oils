import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI);

const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

async function run() {
  const orders = await Order.find({ orderId: { $in: ['ORD-003', 'ORD-004'] } }).lean();
  console.log(orders.map(o => ({ id: o.orderId, status: o.status, paymentStatus: o.paymentStatus, paidAmount: o.paidAmount, total: o.total })));
  mongoose.disconnect();
}
run();
