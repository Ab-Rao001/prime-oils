import mongoose from 'mongoose';

const approvalRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['CREDIT_LIMIT_EXCEEDED', 'LARGE_DISCOUNT', 'STOCK_ADJUSTMENT'], required: true, index: true },
  referenceDocument: { type: mongoose.Schema.Types.ObjectId, required: true }, // e.g. Order ID
  collectionName: { type: String, required: true }, // e.g. 'Order'
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  details: { type: mongoose.Schema.Types.Mixed }, // JSON explaining the violation
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: String,
  resolvedAt: Date
}, { timestamps: true });

export default mongoose.model('ApprovalRequest', approvalRequestSchema);
