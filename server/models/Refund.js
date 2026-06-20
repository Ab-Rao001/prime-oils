import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema({
  refundId: { type: String, unique: true, required: true, index: true },
  returnRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ReturnRequest', required: true, index: true },
  creditNote: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditNote', index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shopkeeper', index: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['CREDIT_BALANCE', 'CASH', 'BANK_TRANSFER'], default: 'CREDIT_BALANCE' },
  status: { type: String, enum: ['REQUESTED', 'COMPLETED', 'FAILED', 'CANCELLED'], default: 'REQUESTED', index: true },
  processedAt: Date,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Refund', refundSchema);
