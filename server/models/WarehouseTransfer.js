import mongoose from 'mongoose';

const warehouseTransferSchema = new mongoose.Schema({
  fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
  toWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true }
  }],
  status: { 
    type: String, 
    enum: ['REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED'],
    default: 'REQUESTED',
    index: true
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('WarehouseTransfer', warehouseTransferSchema);
