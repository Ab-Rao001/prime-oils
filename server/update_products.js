import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Product = mongoose.model('Product', new mongoose.Schema({ name: String, description: String, cat: String, size: String, unit: String }, { strict: false }));
  
  await Product.updateMany({ name: 'Canolive Oil 16 Ltr' }, { $set: { name: 'Canolive Oil 10 Ltr', size: '10 Ltr', unit: 'Can', description: 'Cooking Oil — 10 litre can', cat: 'Cooking Oil' }});
  
  await Product.updateMany({ name: 'Canolive Oil 1 Ltr' }, { $set: { description: 'Cooking Oil — 1 litre bottle', cat: 'Cooking Oil' }});
  await Product.updateMany({ name: 'Canolive Oil 3 Ltr' }, { $set: { description: 'Cooking Oil — 3 litre bottle', cat: 'Cooking Oil' }});
  await Product.updateMany({ name: 'Canolive Oil 4.5 Ltr' }, { $set: { description: 'Cooking Oil — 4.5 litre bottle', cat: 'Cooking Oil' }});
  await Product.updateMany({ name: 'Canolive Oil 5×1 Pouch' }, { $set: { description: 'Cooking Oil — 5×1 litre pouch carton', cat: 'Cooking Oil' }});
  await Product.updateMany({ name: 'Canolive Oil 5×1 Nozzle' }, { $set: { description: 'Cooking Oil — 5×1 pack with nozzle', cat: 'Cooking Oil' }});
  
  console.log('Products updated.');
  process.exit(0);
});
