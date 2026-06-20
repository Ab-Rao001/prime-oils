/**
 * @fileoverview User Model for Authentication & Authorization
 * 
 * Stores user credentials, roles, and metadata.
 * Passwords are hashed using bcrypt (never stored in plaintext).
 * 
 * @module models/User
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import crypto from 'crypto';

const VALID_ROLES = ['admin', 'supplier', 'shopkeeper', 'salesman'];
const SALT_ROUNDS = 12; // For bcrypt password hashing

const userSchema = new mongoose.Schema(
  {
    // Basic info
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must be less than 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: [true, 'Email already registered'],
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Must be a valid email'],
      index: true, // Index for fast lookups
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      validate: {
        validator: function(v) {
          // At least one uppercase, one lowercase, one number, one special character
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v);
        },
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      },
      select: false, // Exclude from default queries for security
    },

    // Role-based access control
    role: {
      type: String,
      enum: {
        values: VALID_ROLES,
        message: `Role must be one of: ${VALID_ROLES.join(', ')}`,
      },
      default: 'shopkeeper',
      required: true,
      index: true, // For role-based queries
    },

    firebaseUid: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },

    avatarUrl: {
      type: String,
      default: null,
    },

    cloudinaryPublicId: {
      type: String,
      default: null,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Status tracking
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'suspended'],
        message: 'Status must be: active, inactive, or suspended',
      },
      default: 'active',
      index: true,
    },

    // User metadata
    phone: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          return v === null || v === '' || validator.isMobilePhone(v);
        },
        message: 'Must be a valid phone number',
      },
    },

    address: {
      type: String,
      default: null,
    },

    // Last login tracking (for security monitoring)
    lastLogin: {
      type: Date,
      default: null,
    },

    loginHistory: [
      {
        time: { type: Date, default: Date.now },
        ip: String,
        status: { type: String, enum: ['success', 'failed'] },
      }
    ],

    // Failed login attempts (for security lockout)
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Lock account if too many failed attempts
    isLocked: {
      type: Boolean,
      default: false,
    },

    lockedUntil: {
      type: Date,
      default: null,
    },

    // Token version for logout-all functionality
    tokenVersion: {
      type: Number,
      default: 0,
    },

    // Password reset functionality
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true, // Auto-adds createdAt, updatedAt
  }
);

/**
 * Hash password before saving (middleware)
 * Only hashes if password field was modified
 */
userSchema.pre('save', async function (next) {
  // Skip if password hasn't changed
  if (!this.isModified('password')) return next();

  try {
    // Hash password with bcrypt
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Compare plaintext password with hashed password
 * 
 * @param {string} passwordAttempt - User's password attempt
 * @returns {Promise<boolean>} True if passwords match
 * 
 * @example
 * const isMatch = await user.comparePassword('userPassword123');
 */
userSchema.methods.comparePassword = async function (passwordAttempt) {
  return await bcrypt.compare(passwordAttempt, this.password);
};

/**
 * Get user payload for JWT token
 * Returns only public/safe fields
 * 
 * @returns {Object} { id, email, role, name }
 */
userSchema.methods.toJWT = function () {
  return {
    id: this._id.toString(),
    email: this.email,
    role: this.role,
    name: this.name,
    avatarUrl: this.avatarUrl,
  };
};

/**
 * Get public user profile (for API responses)
 * Excludes sensitive fields like password
 * 
 * @returns {Object} Public user data
 */
userSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    address: this.address,
    avatarUrl: this.avatarUrl,
    status: this.active === false ? 'inactive' : this.status,
    active: this.active !== false,
    createdAt: this.createdAt,
    joinedDate: this.createdAt,
    lastLogin: this.lastLogin,
    loginHistory: this.loginHistory,
    isSuperAdmin: String(this.email).toLowerCase() === (process.env.SUPER_ADMIN_EMAIL || 'admin@primeoil.com').toLowerCase(),
  };
};

/**
 * Static method: Find user by email with password field
 * 
 * @param {string} email - User email
 * @returns {Promise<Object>} User document with password field
 * 
 * @example
 * const user = await User.findByEmailWithPassword('user@example.com');
 */
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

/**
 * Record failed login attempt
 * Lock account after 5 failed attempts for 15 minutes
 */
userSchema.methods.recordFailedLogin = async function () {
  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= 5) {
    this.isLocked = true;
    this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
  }
  return this.save();
};

/**
 * Reset failed login attempts and unlock account
 */
userSchema.methods.recordSuccessfulLogin = async function () {
  this.failedLoginAttempts = 0;
  this.isLocked = false;
  this.lockedUntil = null;
  this.lastLogin = new Date();
  return this.save();
};

/**
 * Check if account is currently locked
 * @returns {boolean} True if locked and lockout period hasn't expired
 */
userSchema.methods.isAccountLocked = function () {
  if (!this.isLocked) return false;
  if (this.lockedUntil && this.lockedUntil < new Date()) {
    return false; // Lock expired
  }
  return true;
};

userSchema.index({ status: 1, role: 1 });
userSchema.index({ createdAt: -1 });

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
  return resetToken;
};

const User = mongoose.model('User', userSchema);

export default User;
