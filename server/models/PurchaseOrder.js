import mongoose from 'mongoose';

const purchaseOrderSchema = new mongoose.Schema({
  poId: { type: String, unique: true, required: true, index: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: String,
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    totalCost: { type: Number, required: true },
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'received', 'cancelled'], default: 'pending', index: true },
  receivedDate: { type: Date },
  notes: String,
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

purchaseOrderSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
