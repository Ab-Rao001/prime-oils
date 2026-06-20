import mongoose from 'mongoose';

const uri = 'mongodb://62426abrao_db_user:cAeFBAB3DGJxMjn@ac-jtseppl-shard-00-00.suo5dvi.mongodb.net:27017,ac-jtseppl-shard-00-01.suo5dvi.mongodb.net:27017,ac-jtseppl-shard-00-02.suo5dvi.mongodb.net:27017/prime_oils?ssl=true&authSource=admin&retryWrites=true&w=majority';

async function check() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users.`);
    users.forEach(u => console.log(`- ${u.email} (Role: ${u.role})`));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

check();
