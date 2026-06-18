import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // Notification target recipient
  type: { type: String, index: true },
  msg: String,
  date: String,
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

// Define indexes for scalability
notificationSchema.index({ recipient: 1, read: 1 }); // For fast unread counts
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // TTL index: auto-delete notifications after 30 days

export default mongoose.model('Notification', notificationSchema);

