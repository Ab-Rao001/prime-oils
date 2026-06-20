/**
 * syncFirebasePasswords.js
 * 
 * Syncs ALL MongoDB users to Firebase Authentication.
 * - If user exists in Firebase → updates their password to match MongoDB reset
 * - If user doesn't exist in Firebase → creates them in Firebase
 * 
 * Run: node scripts/syncFirebasePasswords.js
 * 
 * IMPORTANT: This must be run after any direct MongoDB password reset.
 * After this, users can log in with the same password on both Firebase and MongoDB.
 */
import '../config/env.js';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import { auth, isFirebaseInitialized } from '../config/firebase.js';
import mongoose from 'mongoose';

await connectDB();

if (!isFirebaseInitialized || !auth) {
  console.error('Firebase Admin SDK not initialized. Check serviceAccountKey.json');
  process.exit(1);
}

// Password mapping — what we reset each role to via resetAllPasswords.js
const PASSWORDS = {
  admin: 'Admin@123456',
  supplier: 'User@123456',
  salesman: 'User@123456',
  shopkeeper: 'User@123456',
};

const users = await User.find({}).select('email role name firebaseUid').lean();
console.log(`\nFound ${users.length} user(s) in MongoDB. Syncing to Firebase...\n`);

let created = 0;
let updated = 0;
let failed = 0;

for (const user of users) {
  const password = PASSWORDS[user.role] || 'User@123456';
  try {
    let fbUser;
    try {
      // Try to get existing Firebase user
      fbUser = await auth.getUserByEmail(user.email);
    } catch {
      fbUser = null;
    }

    if (fbUser) {
      // User exists in Firebase — update their password + display name
      await auth.updateUser(fbUser.uid, {
        password,
        displayName: user.name,
      });
      // Also store firebaseUid back in MongoDB if missing
      if (!user.firebaseUid) {
        await User.updateOne({ email: user.email }, { $set: { firebaseUid: fbUser.uid } });
      }
      console.log(`  ✓ UPDATED  [${user.role}] ${user.email}`);
      updated++;
    } else {
      // User doesn't exist in Firebase — create them
      const newFbUser = await auth.createUser({
        email: user.email,
        password,
        displayName: user.name,
      });
      await User.updateOne({ email: user.email }, { $set: { firebaseUid: newFbUser.uid } });
      console.log(`  ✓ CREATED  [${user.role}] ${user.email}`);
      created++;
    }
  } catch (err) {
    console.error(`  ✗ FAILED   [${user.role}] ${user.email}: ${err.message}`);
    failed++;
  }
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`Created in Firebase : ${created}`);
console.log(`Updated in Firebase : ${updated}`);
console.log(`Failed              : ${failed}`);
console.log(`\nAll synced users can now log in with:`);
for (const [role, pass] of Object.entries(PASSWORDS)) {
  console.log(`  ${role.padEnd(12)} → ${pass}`);
}
console.log(`${'─'.repeat(50)}\n`);

await mongoose.disconnect();
process.exit(0);
