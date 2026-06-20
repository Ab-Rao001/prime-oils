import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  refreshTokenHash: {
    type: String,
    required: true
  },
  deviceInfo: {
    type: String,
    default: 'Unknown Device'
  },
  browser: {
    type: String,
    default: 'Unknown Browser'
  },
  ipAddress: {
    type: String,
    default: 'Unknown IP'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Automatically remove expired sessions
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isRevoked: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

const Session = mongoose.model('Session', sessionSchema);
export default Session;
