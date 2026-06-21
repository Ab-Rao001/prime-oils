import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, required: true, index: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shopkeeper', index: true, required: true },
  man: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // Salesman
  items: Number,
  lineItems: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      productName: String,
      quantity: { type: Number, default: 0 },
      unitCost: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
    },
  ],
  totalCogs: { type: Number, default: 0 },
  total: { type: Number, index: true },
  status: { 
    type: String, 
    enum: ['pending', 'pending_approval', 'paid', 'confirmed', 'ready_for_dispatch', 'in_transit', 'partially_delivered', 'delivered', 'return_requested', 'returned', 'cancelled'],
    default: 'pending', 
    index: true 
  },
  date: String,
  pay: { type: String, index: true },
  paymentStatus: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending', index: true },
  paidAmount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Define indexes for scalability
orderSchema.index({ status: 1, createdAt: -1 }); // Compound index for order dashboard queries
orderSchema.index({ shop: 1, isDeleted: 1, createdAt: -1 }); // High-performance shopkeeper queries
orderSchema.index({ shop: 1, status: 1, createdAt: -1 }); // Compound index for customer order history lookup
orderSchema.index({ shop: 1, createdAt: -1 });
orderSchema.index({ man: 1, isDeleted: 1, createdAt: -1 }); // High-performance salesman queries
orderSchema.index({ man: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ man: 1, date: -1 }); // Compound index for salesman daily tracking

export default mongoose.model('Order', orderSchema);

