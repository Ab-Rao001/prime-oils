import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  action: { type: String, required: true, index: true }, // e.g., 'UPDATE_ORDER', 'DELETE_PRODUCT'
  collectionName: { type: String, required: true, index: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index for fast lookups on a specific document's history
auditLogSchema.index({ collectionName: 1, documentId: 1, timestamp: -1 });

// TTL index to automatically delete audit logs
const retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || 365, 10);
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: retentionDays * 86400 });

export default mongoose.model('AuditLog', auditLogSchema);
