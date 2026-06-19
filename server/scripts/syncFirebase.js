import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User.js';
import { auth, isFirebaseInitialized } from '../config/firebase.js';

async function syncUsers() {
  if (!isFirebaseInitialized || !auth) {
    console.error('Firebase is not initialized. Please ensure serviceAccountKey.json exists.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({ firebaseUid: { $exists: false } }).select('+password');
    console.log(`Found ${users.length} users in MongoDB that need Firebase syncing.`);

    for (const user of users) {
      try {
        let firebaseUser;
        try {
          // Check if user already exists in Firebase by email
          firebaseUser = await auth.getUserByEmail(user.email);
          console.log(`User ${user.email} already exists in Firebase. Updating Mongo...`);
        } catch (err) {
          if (err.code === 'auth/user-not-found') {
            console.log(`Creating user ${user.email} in Firebase...`);
            
            // Try to import user with bcrypt hash. If it fails, fallback to simple createUser
            try {
              const importResult = await auth.importUsers([{
                uid: user._id.toString(),
                email: user.email,
                passwordHash: Buffer.from(user.password),
                displayName: user.name,
              }], {
                hash: { algorithm: 'BCRYPT' }
              });
              
              if (importResult.errors.length > 0) {
                 console.error('Import error details:', importResult.errors[0].error);
                 throw new Error('Failed to import with BCRYPT');
              }
              
              firebaseUser = { uid: user._id.toString() };
              console.log(`Successfully imported ${user.email} with BCRYPT hash.`);
            } catch (importErr) {
               console.warn(`BCRYPT import failed, falling back to createUser for ${user.email}. Password reset will be required.`);
               firebaseUser = await auth.createUser({
                 uid: user._id.toString(),
                 email: user.email,
                 displayName: user.name,
                 password: 'ChangeMe123!' // Placeholder password
               });
            }
          } else {
            throw err; // Re-throw other errors
          }
        }

        user.firebaseUid = firebaseUser.uid;
        await user.save();
        console.log(`Synced ${user.email} -> Firebase UID: ${firebaseUser.uid}`);

      } catch (userErr) {
        console.error(`Error syncing user ${user.email}:`, userErr.message);
      }
    }

    console.log('Sync complete.');
    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

syncUsers();
