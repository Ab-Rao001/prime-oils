import mongoose from 'mongoose';

mongoose.connect('mongodb://62426abrao_db_user:cAeFBAB3DGJxMjn@ac-jtseppl-shard-00-00.suo5dvi.mongodb.net:27017,ac-jtseppl-shard-00-01.suo5dvi.mongodb.net:27017,ac-jtseppl-shard-00-02.suo5dvi.mongodb.net:27017/prime_oils?ssl=true&authSource=admin&retryWrites=true&w=majority');

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

async function run() {
  const usersWithNullFb = await User.countDocuments({ firebaseUid: null });
  console.log('Users with null firebaseUid:', usersWithNullFb);

  // Remove firebaseUid field from users where it is null
  const res = await User.updateMany(
    { firebaseUid: null },
    { $unset: { firebaseUid: "" } }
  );
  console.log('Fixed users:', res);
  mongoose.disconnect();
}
run();
