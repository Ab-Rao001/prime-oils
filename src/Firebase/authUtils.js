import { auth, db } from '../Firebase/firebase';
import { setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';

/**
 * Get readable error message from Firebase error codes
 */
export const getAuthErrorMessage = (errorCode) => {
  const errorMessages = {
    'auth/user-not-found': 'No user found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-email': 'Invalid email format.',
    'auth/user-disabled': 'This user account has been disabled.',
    'auth/too-many-requests': 'Too many login attempts. Please try again later.',
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/operation-not-allowed': 'Operation not allowed.',
    'auth/invalid-credential': 'Invalid credentials provided.',
  };
  
  return errorMessages[errorCode] || 'An error occurred. Please try again.';
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  const rules = {
    minLength: password.length >= 6,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  };
  
  return {
    isValid: Object.values(rules).every(rule => rule === true),
    rules
  };
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Get user data from Firestore
 */
export const getUserData = async (userId) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      return userDocSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, profileData) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, profileData);
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if email exists in Firestore
 */
export const emailExists = async (email) => {
  try {
    // Note: This is a simple check. In production, use proper Firestore queries with indexes
    // For now, this relies on Firebase Auth which prevents duplicate emails
    return false; // This will be caught by Firebase Auth
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
};

/**
 * Format user object for display
 */
export const formatUserData = (firebaseUser, firestoreData) => {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    name: firestoreData?.name || firebaseUser.displayName || '',
    role: firestoreData?.role || 'user',
    status: firestoreData?.status || 'active',
    createdAt: firestoreData?.createdAt || new Date(),
  };
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: 'Password reset email sent successfully.' };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
};

/**
 * Create user with custom password (Admin function)
 */
export const createUserWithPassword = async (email, password, name, role) => {
  try {
    // Note: This requires a backend Cloud Function to work securely
    // For now, return error as Firebase doesn't allow direct user creation
    // Users must be created via signup or Firebase Console
    return { success: false, error: 'Use signup form or Firebase Console to create users' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
