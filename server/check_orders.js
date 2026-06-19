import mongoose from 'mongoose';

mongoose.connect('mongodb://db_user:password@cluster.mongodb.net/prime_oils').then(async () => {
  console.log('Connected to DB');
  
  const Order = mongoose.model('Order', new mongoose.Schema({
    status: String,
    isDeleted: Boolean
  }));

  const orders = await Order.find({}, 'status isDeleted');
  console.log('All Orders:', orders);

  const pending = await Order.countDocuments({ status: 'pending', isDeleted: { $ne: true } });
  const confirmed = await Order.countDocuments({ status: { $in: ['confirmed', 'ready_for_dispatch'] }, isDeleted: { $ne: true } });
  const paid = await Order.countDocuments({ status: 'paid', isDeleted: { $ne: true } });
  
  console.log({ pending, confirmed, paid });
  
  mongoose.connection.close();
}).catch(console.error);
