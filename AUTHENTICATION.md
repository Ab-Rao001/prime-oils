# Firebase Authentication System - Prime Oil Suppliers

## Overview

This document describes the complete Firebase authentication system implemented for the Prime Oil Suppliers application. The system replaces the previous demo authentication with a secure, production-ready authentication system using Firebase Authentication and Firestore.

## Features

- ✅ **Email/Password Authentication** - Firebase Authentication for secure login
- ✅ **User Registration** - New users can sign up with email, password, and role selection
- ✅ **Role-Based Access Control (RBAC)** - Four roles: Admin, Shopkeeper, Salesman, Supplier
- ✅ **Persistent Authentication** - Session persisted across page refreshes
- ✅ **Firestore Integration** - User profiles stored in Firestore database
- ✅ **Protected Routes** - Components to restrict access based on authentication and roles
- ✅ **Error Handling** - User-friendly error messages for all authentication errors
- ✅ **Setup Wizard** - Easy initialization of demo users for testing

## Architecture

### Firebase Configuration
- **File**: `src/Firebase/firebase.js`
- Configures Firebase App, Authentication, and Firestore
- Exports `app`, `auth`, and `db` for use throughout the application

### Authentication Context
- **File**: `src/context/AuthContext.jsx`
- Provides global authentication state management
- Uses Firebase's `onAuthStateChanged` for persistent authentication
- Available through `useAuth()` hook

### Auth Hook
- **File**: `src/hooks/useAuth.js`
- Custom hook for accessing authentication context
- Usage: `const { user, userRole, loading, isAuthenticated } = useAuth();`

### Protected Route Component
- **File**: `src/components/ProtectedRoute.jsx`
- Wraps components to restrict access
- Supports role-based restriction
- Usage: `<ProtectedRoute requiredRoles={['admin']}><AdminDashboard /></ProtectedRoute>`

### Utilities
- **File**: `src/Firebase/authUtils.js` - Helper functions for authentication
- **File**: `src/Firebase/firebaseInit.js` - Demo data initialization

## User Roles

| Role | Permissions | Access Level |
|------|-------------|--------------|
| Admin | Full system access, user management | All features |
| Shopkeeper | View orders, payments, complaints | Limited |
| Salesman | Orders, inventory, payments, shopkeepers list | Medium |
| Supplier | Inventory, orders, notifications | Limited |

## Demo Users

After running the setup wizard, the following demo accounts are available:

```
Email: admin@primeoil.com
Password: Admin@123
Role: Admin

Email: ali@shop.com
Password: Shop@123
Role: Shopkeeper

Email: kamran@primeoil.com
Password: Sales@123
Role: Salesman

Email: supply@factory.com
Password: Supply@123
Role: Supplier
```

## File Structure

```
src/
├── Firebase/
│   ├── firebase.js          # Firebase configuration
│   ├── authUtils.js         # Authentication utilities
│   └── firebaseInit.js      # Demo data initialization
├── context/
│   └── AuthContext.jsx      # Authentication context
├── hooks/
│   └── useAuth.js           # Auth context hook
├── components/
│   └── ProtectedRoute.jsx   # Protected route wrapper
└── pages/
    ├── Auth.jsx             # Login/Signup page
    ├── Setup.jsx            # Setup wizard
    └── Dashboard.jsx        # Main dashboard
```

## Usage Examples

### 1. Check if User is Authenticated
```jsx
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;
  
  return <div>Welcome, {user.name}!</div>;
}
```

### 2. Get User Role
```jsx
const { userRole } = useAuth();

if (userRole === 'admin') {
  // Show admin features
}
```

### 3. Logout
```jsx
import { signOut } from 'firebase/auth';
import { auth } from './Firebase/firebase';

const handleLogout = async () => {
  await signOut(auth);
  // User will be redirected to landing page automatically
};
```

### 4. Protect a Route
```jsx
<ProtectedRoute requiredRoles={['admin', 'salesman']}>
  <SalesPage />
</ProtectedRoute>
```

## Authentication Flow

1. **Landing Page** - User sees landing page with Login, Sign Up, and Setup buttons
2. **Setup (Optional)** - Admin can click Setup to initialize demo users
3. **Login** - User enters email and password
4. **Firebase Auth** - Firebase validates credentials
5. **Firestore Lookup** - User role and data fetched from Firestore
6. **AuthContext Update** - User state updated globally
7. **Automatic Redirect** - App automatically shows Dashboard for authenticated users

## Firestore Schema

### Users Collection
```
/users/{userId}
├── name: string
├── email: string
├── role: string (admin | shopkeeper | salesman | supplier)
├── status: string (active | inactive)
└── createdAt: timestamp
```

## Security Rules

**Note**: You should configure Firestore security rules in Firebase Console. Example rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can only read their own document
      allow read: if request.auth.uid == userId;
      // Only admins can write user documents
      allow write: if request.auth.token.role == 'admin';
    }
  }
}
```

## Password Requirements

- Minimum 6 characters
- Mixed case recommended (uppercase and lowercase)
- Numbers recommended
- No special character requirements

## Setup Instructions

### 1. First Time Setup
1. Go to the application landing page
2. Click the "⚙️ Setup" button
3. Click "Initialize Demo Users"
4. Wait for confirmation
5. Click "Back to Landing"
6. Log in with demo credentials

### 2. Manual User Creation
Users can click "Sign Up" to create their own account:
1. Enter full name
2. Enter email address
3. Enter and confirm password
4. Select role
5. Click "Create Account"

### 3. Firebase Console Setup (For Real Deployment)
1. Enable Email/Password authentication in Firebase Console
2. Create Firestore database
3. Set appropriate security rules
4. Create admin user manually through Sign Up

## Troubleshooting

### Users can't log in
- Check Firebase Authentication is enabled in Firebase Console
- Verify users exist in Firestore collection
- Check browser console for error messages

### Demo users not created
- Click Setup button again
- Check Firebase Console for authentication errors
- Verify Firestore is properly configured

### Role doesn't appear after login
- Check user document in Firestore has 'role' field
- Verify AuthContext is properly initialized
- Clear browser cache and refresh

## API Reference

### AuthContext Values
- `user`: Current user object or null
- `userRole`: User's role string or null
- `loading`: Boolean indicating if auth state is loading
- `error`: Error message if any
- `isAuthenticated`: Boolean indicating if user is logged in

### Utility Functions

#### `getAuthErrorMessage(errorCode)`
Returns user-friendly error message for Firebase error codes

#### `validatePassword(password)`
Returns validation result for password strength

#### `validateEmail(email)`
Returns boolean indicating valid email format

#### `getUserData(userId)`
Fetches user data from Firestore

#### `initializeDemoUsers()`
Creates demo users in Firebase

## Migration from Demo Authentication

The system automatically:
1. Removed local state authentication
2. Removed demo user array from mockData
3. Integrated Firebase Authentication
4. Connected user role system to Firestore
5. Added persistent session management

## Future Enhancements

- [ ] Google/Facebook OAuth integration
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] User profile editing
- [ ] Admin user management panel
- [ ] Login history and activity logs
- [ ] Rate limiting for login attempts

## Support

For issues or questions:
1. Check Firebase Console for authentication errors
2. Review browser console for error logs
3. Verify Firestore security rules
4. Check network tab for failed requests

---

**Last Updated**: April 2026  
**Version**: 1.0.0  
**Status**: Production Ready
