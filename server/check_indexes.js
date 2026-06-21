import mongoose from 'mongoose';

mongoose.connect('mongodb://62426abrao_db_user:cAeFBAB3DGJxMjn@ac-jtseppl-shard-00-00.suo5dvi.mongodb.net:27017,ac-jtseppl-shard-00-01.suo5dvi.mongodb.net:27017,ac-jtseppl-shard-00-02.suo5dvi.mongodb.net:27017/prime_oils?ssl=true&authSource=admin&retryWrites=true&w=majority');

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Shopkeeper = mongoose.model('Shopkeeper', new mongoose.Schema({}, { strict: false }));

async function run() {
  const userIndexes = await User.collection.indexes();
  console.log('User Indexes:');
  console.log(JSON.stringify(userIndexes, null, 2));

  const skIndexes = await Shopkeeper.collection.indexes();
  console.log('Shopkeeper Indexes:');
  console.log(JSON.stringify(skIndexes, null, 2));

  mongoose.disconnect();
}
run();
