import mongoose from 'mongoose';

mongoose.connect('mongodb://62426abrao_db_user:cAeFBAB3DGJxMjn@ac-jtseppl-shard-00-00.suo5dvi.mongodb.net:27017,ac-jtseppl-shard-00-01.suo5dvi.mongodb.net:27017,ac-jtseppl-shard-00-02.suo5dvi.mongodb.net:27017/prime_oils?ssl=true&authSource=admin&retryWrites=true&w=majority');

const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false }));
const Complaint = mongoose.model('Complaint', new mongoose.Schema({}, { strict: false }));

async function run() {
  const oIdx = await Order.collection.indexes();
  console.log('Order Indexes:', oIdx.map(i => i.name));

  const pIdx = await Payment.collection.indexes();
  console.log('Payment Indexes:', pIdx.map(i => i.name));

  const cIdx = await Complaint.collection.indexes();
  console.log('Complaint Indexes:', cIdx.map(i => i.name));

  mongoose.disconnect();
}
run();
