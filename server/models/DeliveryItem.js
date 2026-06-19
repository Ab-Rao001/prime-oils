import mongoose from 'mongoose';

const deliveryItemSchema = new mongoose.Schema({
  dispatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispatch', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  expectedQuantity: { type: Number, required: true },
  deliveredQuantity: { type: Number, default: 0 },
  returnedQuantity: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['DELIVERED', 'DAMAGED', 'MISSING', 'REFUSED'],
    required: true,
    index: true
  },
  reason: { type: String },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model('DeliveryItem', deliveryItemSchema);
