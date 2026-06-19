import mongoose from 'mongoose';

const returnRequestSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Shopkeeper', required: true, index: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true }
  }],
  reason: { 
    type: String, 
    enum: ['Leakage', 'Damaged packaging', 'Expired product', 'Wrong product', 'Quality issue', 'Other'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['REQUESTED', 'INSPECTING', 'APPROVED', 'RECEIVED', 'REJECTED', 'COMPLETED'],
    default: 'REQUESTED',
    index: true
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' }
}, { timestamps: true });

export default mongoose.model('ReturnRequest', returnRequestSchema);
