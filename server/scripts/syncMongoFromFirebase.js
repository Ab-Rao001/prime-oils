import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import User from '../models/User.js';
import { auth, isFirebaseInitialized } from '../config/firebase.js';

async function syncUsersFromFirebase() {
  if (!isFirebaseInitialized || !auth) {
    console.error('Firebase is not initialized. Please ensure serviceAccountKey.json exists.');
    process.exit(1);
  }

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/prime-oil';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // List all users from Firebase
    let allFirebaseUsers = [];
    let pageToken;
    do {
      const listUsersResult = await auth.listUsers(1000, pageToken);
      allFirebaseUsers = allFirebaseUsers.concat(listUsersResult.users);
      pageToken = listUsersResult.pageToken;
    } while (pageToken);

    console.log(`Found ${allFirebaseUsers.length} users in Firebase.`);

    for (const fbUser of allFirebaseUsers) {
      if (!fbUser.email) continue;
      
      let user = await User.findOne({ email: fbUser.email.toLowerCase() });
      if (!user) {
        // Create the user in MongoDB
        console.log(`Creating missing MongoDB profile for ${fbUser.email}`);
        user = new User({
          name: fbUser.displayName || fbUser.email.split('@')[0],
          email: fbUser.email.toLowerCase(),
          password: 'FirebaseUser123!', // Required by schema, not used if logging in via Firebase
          firebaseUid: fbUser.uid,
          role: fbUser.email === 'admin@primeoil.com' ? 'admin' : 'salesman', // Setting default to salesman for manual testing
          status: 'active'
        });
        await user.save();
        console.log(`Successfully created profile for ${fbUser.email} (UID: ${fbUser.uid})`);
      } else {
        console.log(`User ${fbUser.email} already exists in MongoDB.`);
        // Ensure firebaseUid is set
        if (!user.firebaseUid) {
          user.firebaseUid = fbUser.uid;
          await user.save();
          console.log(`Updated missing firebaseUid for ${fbUser.email}`);
        }
      }
    }

    console.log('Firebase -> MongoDB sync complete.');
    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

syncUsersFromFirebase();
