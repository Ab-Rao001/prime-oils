import mongoose from 'mongoose';

const returnRequestSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Shopkeeper', required: true, index: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number },
    condition: { type: String, enum: ['UNOPENED', 'DAMAGED', 'EXPIRED', 'WRONG_ITEM'] },
    disposition: { type: String, enum: ['RESTOCK_SELLABLE', 'RESTOCK_DAMAGED', 'SCRAP', 'REWORK'] },
  }],
  reason: { 
    type: String, 
    enum: ['Leakage', 'Damaged packaging', 'Expired product', 'Wrong product', 'Quality issue', 'Other'],
    required: true 
  },
  resolutionType: {
    type: String,
    enum: ['REFUND', 'CREDIT_NOTE', 'REPLACEMENT', 'EXCHANGE'],
    default: 'REFUND',
  },
  complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', index: true },
  rmaId: { type: String, unique: true, sparse: true, index: true },
  notes: String,
  inspectionNotes: String,
  inspectionGrade: { type: String, enum: ['PASS', 'FAIL', 'PARTIAL'] },
  inspectionPhotos: [String],
  approvalNotes: String,
  receivedAt: Date,
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { 
    type: String, 
    enum: ['REQUESTED', 'INSPECTING', 'APPROVED', 'RECEIVED', 'REJECTED', 'COMPLETED'],
    default: 'REQUESTED',
    index: true
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' },
  stockMovementIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' }],
  creditNoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditNote', index: true },
  refundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Refund', index: true },
  replacementOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  settlementStatus: { type: String, enum: ['PENDING', 'SETTLED'], default: 'PENDING', index: true },
  settlementAmount: { type: Number, default: 0 },
  settledAt: Date,
}, { timestamps: true });

returnRequestSchema.index({ status: 1, createdAt: -1 });
returnRequestSchema.index({ order: 1, createdAt: -1 });

export default mongoose.model('ReturnRequest', returnRequestSchema);
