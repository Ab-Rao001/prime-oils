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
    },
  ],
  total: { type: Number, index: true },
  status: { type: String, default: 'pending', index: true },
  date: String,
  pay: { type: String, index: true },
}, { timestamps: true });

// Define indexes for scalability
orderSchema.index({ status: 1, createdAt: -1 }); // Compound index for order dashboard queries
orderSchema.index({ shop: 1, status: 1 }); // Compound index for customer order history lookup

export default mongoose.model('Order', orderSchema);

