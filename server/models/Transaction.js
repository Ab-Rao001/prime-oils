import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, unique: true, required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true, required: true },
  shopkeeper: { type: mongoose.Schema.Types.ObjectId, ref: 'Shopkeeper', index: true, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'success', index: true },
  paymentMethod: { type: String, default: 'simulated_gateway' },
  gatewayResponse: { type: String, default: 'Approved. Simulated transaction for module requirement.' }
}, { timestamps: true });

transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ order: 1 });
transactionSchema.index({ createdAt: -1 });

export default mongoose.model('Transaction', transactionSchema);
