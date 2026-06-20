import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  complaintId: { type: String, unique: true, required: true, index: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shopkeeper', index: true, required: true },
  product: { type: String, index: true }, // Legacy product name string
  productRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true }, // Normalized product reference
  orderRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  returnRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReturnRequest', index: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  issue: String,
  type: { type: String, enum: ['damaged', 'order', 'exchange', 'quality', 'delivery', 'behaviour'], index: true },
  status: {
    type: String,
    enum: ['pending', 'in_review', 'processing', 'resolved', 'converted_to_return', 'escalated', 'closed_no_action'],
    default: 'pending',
    index: true,
  },
  date: String,
}, { timestamps: true });

// Define compound indexes for dashboard and tracking
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ shop: 1, status: 1 });

export default mongoose.model('Complaint', complaintSchema);

