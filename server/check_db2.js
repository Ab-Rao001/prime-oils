import mongoose from 'mongoose';

mongoose.connect('mongodb://62426abrao_db_user:cAeFBAB3DGJxMjn@ac-jtseppl-shard-00-00.suo5dvi.mongodb.net:27017,ac-jtseppl-shard-00-01.suo5dvi.mongodb.net:27017,ac-jtseppl-shard-00-02.suo5dvi.mongodb.net:27017/prime_oils?ssl=true&authSource=admin&retryWrites=true&w=majority');

const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false }));

async function run() {
  const orders = await Order.find({ orderId: { $in: ['ORD-003', 'ORD-004'] } }).lean();
  console.log('Orders:');
  console.log(orders.map(o => ({ id: o.orderId, status: o.status, paymentStatus: o.paymentStatus, paidAmount: o.paidAmount, total: o.total })));
  
  const payments = await Payment.find({ paymentId: { $in: ['PAY-003', 'PAY-004'] } }).lean();
  console.log('Payments:');
  console.log(payments.map(p => ({ id: p.paymentId, status: p.status, paid: p.paid, total: p.total })));
  mongoose.disconnect();
}
run();
