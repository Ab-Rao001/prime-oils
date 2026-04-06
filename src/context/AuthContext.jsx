import React, { createContext, useState, useEffect } from 'react';
import { auth, db } from '../Firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc, setDoc } from 'firebase/firestore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // Fetch user role from Firestore
          const userDocRef = doc(db, 'users', currentUser.uid);
          let userData = null;
          let roleToAssign = 'user';

          try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              // User exists in Firestore
              userData = userDocSnap.data();
              roleToAssign = userData.role || 'user';
            } else {
              // Determine role for new user
              if (currentUser.email === 'admin@primeoil.com') {
                roleToAssign = 'admin';
              }
              userData = null;
            }
          } catch (firestoreError) {
            // Even if Firestore fails, still log in the user
            if (currentUser.email === 'admin@primeoil.com') {
              roleToAssign = 'admin';
            }
            userData = null;
          }

          // Always set user, even if Firestore failed
          setUser({
            id: currentUser.uid,
            email: currentUser.email,
            name: userData?.name || currentUser.displayName || '',
            displayName: currentUser.displayName,
          });
          setUserRole(roleToAssign);

          // Try to auto-create Firestore document if it doesn't exist
          if (!userData) {
            try {
              await setDoc(userDocRef, {
                name: currentUser.displayName || '',
                email: currentUser.email,
                role: roleToAssign,
                status: 'active',
                createdAt: new Date(),
              });
            } catch (firestoreWriteError) {
              // Silently ignore - user is still logged in
            }
          }
        } else {
          setUser(null);
          setUserRole(null);
        }
      } catch (err) {
        console.error('❌ Auth error:', err.code);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    userRole,
    loading,
    error,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
