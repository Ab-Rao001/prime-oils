import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, unique: true, required: true, index: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shopkeeper', index: true, required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  total: { type: Number, index: true },
  paid: { type: Number, default: 0, index: true },
  type: String,
  due: { type: String, index: true },
  status: { type: String, index: true },
}, { timestamps: true });

// Define compound indexes for queries
paymentSchema.index({ shop: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ order: 1 });

export default mongoose.model('Payment', paymentSchema);

