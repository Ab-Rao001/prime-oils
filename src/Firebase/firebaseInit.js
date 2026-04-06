import { auth, db } from '../Firebase/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';

/**
 * Initialize Firebase with demo users.
 * This function creates demo users in Firebase Authentication and Firestore.
 * Run this once to set up the demo data.
 * 
 * DEMO USERS (after running this):
 * Email: admin@primeoil.com | Password: Admin@123 | Role: Admin
 * Email: ali@shop.com | Password: Shop@123 | Role: Shopkeeper
 * Email: kamran@primeoil.com | Password: Sales@123 | Role: Salesman
 * Email: supply@factory.com | Password: Supply@123 | Role: Supplier
 */
export const initializeDemoUsers = async () => {
  const demoUsers = [
    { email: 'admin@primeoil.com', password: 'Admin@123', name: 'Ahmad Raza', role: 'admin' },
    { email: 'ali@shop.com', password: 'Shop@123', name: 'Ali Traders', role: 'shopkeeper' },
    { email: 'kamran@primeoil.com', password: 'Sales@123', name: 'Kamran Saleem', role: 'salesman' },
    { email: 'supply@factory.com', password: 'Supply@123', name: 'Factory Direct', role: 'supplier' },
  ];

  console.log('Initializing demo users...');
  
  for (const demoUser of demoUsers) {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        demoUser.email,
        demoUser.password
      );
      
      const user = userCredential.user;
      
      // Store user data in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name: demoUser.name,
        email: demoUser.email,
        role: demoUser.role,
        status: 'active',
        createdAt: new Date(),
      });
      
      console.log(`✓ Created user: ${demoUser.email} (${demoUser.role})`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`✓ User already exists: ${demoUser.email}`);
      } else {
        console.error(`✗ Error creating user ${demoUser.email}:`, error.message);
      }
    }
  }
  
  console.log('Demo users initialization complete!');
};

/**
 * Get all users from Firestore (Admin only)
 */
export const getAllUsers = async () => {
  try {
    // Note: This requires Firestore security rules to allow reading the users collection
    // For now, this is a placeholder. In production, use proper Firestore queries
    console.log('getAllUsers requires proper Firestore setup');
    return [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

/**
 * Update user role (Admin only)
 */
export const updateUserRole = async (userId, newRole) => {
  try {
    await setDoc(doc(db, 'users', userId), { role: newRole }, { merge: true });
    console.log(`✓ Updated user role to ${newRole}`);
  } catch (error) {
    console.error('Error updating user role:', error);
  }
};

/**
 * Deactivate user (Admin only)
 */
export const deactivateUser = async (userId) => {
  try {
    await setDoc(doc(db, 'users', userId), { status: 'inactive' }, { merge: true });
    console.log(`✓ User deactivated`);
  } catch (error) {
    console.error('Error deactivating user:', error);
  }
};
