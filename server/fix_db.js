import mongoose from 'mongoose';

mongoose.connect('mongodb://62426abrao_db_user:cAeFBAB3DGJxMjn@ac-jtseppl-shard-00-00.suo5dvi.mongodb.net:27017,ac-jtseppl-shard-00-01.suo5dvi.mongodb.net:27017,ac-jtseppl-shard-00-02.suo5dvi.mongodb.net:27017/prime_oils?ssl=true&authSource=admin&retryWrites=true&w=majority');

const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));

async function run() {
  // Fix any orders where paymentStatus is paid but status is pending
  const res = await Order.updateMany(
    { paymentStatus: 'paid', status: 'pending' },
    { $set: { status: 'paid' } }
  );
  console.log('Fixed:', res);
  mongoose.disconnect();
}
run();
