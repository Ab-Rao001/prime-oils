# Quick Start Guide - Firebase Authentication

## 🚀 Getting Started

### Step 1: Initialize Demo Users

1. Start the application: `npm start`
2. Click the **"⚙️ Setup"** button on the landing page
3. Click **"Initialize Demo Users"**
4. Wait for confirmation message
5. Click **"Back to Landing"**

### Step 2: Login with Demo Account

Select any demo account to test:

```
Email: admin@primeoil.com
Password: Admin@123
Role: Administrator - Full Access
```

Other available accounts:
- `ali@shop.com` / `Shop@123` (Shopkeeper)
- `kamran@primeoil.com` / `Sales@123` (Salesman)
- `supply@factory.com` / `Supply@123` (Supplier)

### Step 3: Test Role-Based Access

Different roles see different menu options:

**Admin** See All Features:
- Overview, Inventory, Orders, Payments, CashFlow
- Notifications, Complaints, Marketing
- Shopkeepers, Reports, User Management

**Shopkeeper** Limited Access:
- Overview, Orders, Payments
- Notifications, Complaints

**Salesman** Medium Access:
- Overview, Orders, Payments, Inventory
- Notifications, Shopkeepers

**Supplier** Limited Access:
- Inventory, Orders, Notifications

## 🔐 Creating Your Own Account

1. Click **"Sign Up"** tab
2. Enter full name
3. Enter email address
4. Enter password (min 6 characters)
5. Confirm password
6. Select your role
7. Click **"Create Account"**
8. Auto-login to dashboard

## 📋 Default Roles Available for Sign Up

- **Shopkeeper** (resellers)
- **Salesman** (sales team)
- **Supplier** (vendors)

*Note: Admin role is only for system administrators and should be set manually in Firebase*

## 🔑 Password Requirements

- Minimum 6 characters
- Can contain uppercase, lowercase, numbers
- No special character requirements

## 🚪 Logout

Click your name in the top-right corner of the dashboard and select logout.

## ❌ Troubleshooting

### "Email not found" - Login fails
- Make sure you initialized demo users first
- Check email is spelled correctly
- Try signing up with a new account

### Can't see Setup button
- Refresh the page
- Clear browser cache
- The button appears on landing page only

### Password too weak error during signup
- Use at least 6 characters
- Include mix of uppercase and lowercase

### Dashboard doesn't load after login
- Check browser console for errors
- Verify Firebase is configured correctly
- Try logging out and back in

## 📁 Important Files

- `src/Firebase/firebase.js` - Firebase configuration
- `src/context/AuthContext.jsx` - Authentication state management
- `src/pages/Auth.jsx` - Login/Signup page
- `src/pages/Setup.jsx` - Demo user initialization

## 🌐 Firebase Console Setup

If you're setting this up for production:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select "prime-oils" project
3. Enable **Authentication** > **Email/Password**
4. Create **Firestore** database
5. Set appropriate security rules

## 📚 Full Documentation

See `AUTHENTICATION.md` for comprehensive documentation including:
- Architecture overview
- API reference
- Firestore schema
- Security rules
- Advanced features

---

**Need Help?** Check `AUTHENTICATION.md` for complete documentation
