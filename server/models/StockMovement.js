import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' }, // Optional for now, defaults to 'Main' logically
  movementType: { 
    type: String, 
    enum: ['purchase', 'sale', 'transfer_in', 'transfer_out', 'return', 'damage', 'adjustment', 'CREDIT_APPROVED_SALE', 'ORDER_CANCELLATION_RETURN'], 
    required: true,
    index: true
  },
  quantityChanged: { type: Number, required: true }, // Can be positive or negative
  previousQuantity: { type: Number, required: true },
  newQuantity: { type: Number, required: true },
  referenceDocument: { type: mongoose.Schema.Types.ObjectId }, // e.g., OrderId, PurchaseOrderId
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  notes: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// Compound indexes for fast historical reconciliation
stockMovementSchema.index({ product: 1, timestamp: -1 });
stockMovementSchema.index({ warehouse: 1, timestamp: -1 });
stockMovementSchema.index({ movementType: 1, timestamp: -1 });
stockMovementSchema.index({ referenceDocument: 1 });

export default mongoose.model('StockMovement', stockMovementSchema);
