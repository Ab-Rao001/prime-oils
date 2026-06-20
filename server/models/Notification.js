import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Null for system
  role: { type: String, enum: ['admin', 'supplier', 'salesman', 'shopkeeper', 'all'] }, // Broadcast
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['ORDER', 'DELIVERY', 'INVENTORY', 'PAYMENT', 'COMPLAINT', 'RETURN', 'SECURITY', 'SYSTEM', 'order', 'delivery', 'inventory', 'payment', 'complaint', 'return'], // lowercase added for backwards compatibility during migration
    index: true 
  },
  priority: { 
    type: String, 
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], 
    default: 'MEDIUM' 
  },
  module: { type: String },
  documentId: { type: mongoose.Schema.Types.ObjectId }, 
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed }, 
  date: { type: String }, // Backwards compatibility for existing code that uses string 'date'
  msg: { type: String }   // Backwards compatibility for existing code
}, { timestamps: true });

// Required Indexes for scalability
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 }); 
notificationSchema.index({ role: 1, createdAt: -1 }); 
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // TTL: 30 days

export default mongoose.model('Notification', notificationSchema);
