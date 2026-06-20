import mongoose from 'mongoose';
import User from './models/User.js'; // Assuming this exports the Mongoose model properly
import dotenv from 'dotenv';
dotenv.config();

const uri = 'mongodb://62426abrao_db_user:cAeFBAB3DGJxMjn@ac-jtseppl-shard-00-00.suo5dvi.mongodb.net:27017,ac-jtseppl-shard-00-01.suo5dvi.mongodb.net:27017,ac-jtseppl-shard-00-02.suo5dvi.mongodb.net:27017/prime_oils?ssl=true&authSource=admin&retryWrites=true&w=majority';

async function resetPassword() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to DB');
    
    const user = await User.findOne({ email: 'admin@primeoil.com' });
    if (!user) {
      console.log('Admin user not found!');
      return;
    }
    
    user.password = 'Password123';
    // reset locked status if any
    user.failedLoginAttempts = 0;
    user.isLocked = false;
    user.lockedUntil = null;
    
    await user.save();
    console.log('Admin password successfully reset to: Password123');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

resetPassword();
