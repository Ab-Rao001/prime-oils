import mongoose from 'mongoose';

const creditNoteSchema = new mongoose.Schema({
  creditNoteId: { type: String, unique: true, required: true, index: true },
  returnRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ReturnRequest', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shopkeeper', required: true, index: true },
  lines: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    quantity: Number,
    unitPrice: Number,
    lineTotal: Number,
  }],
  total: { type: Number, required: true },
  status: { type: String, enum: ['DRAFT', 'POSTED', 'CANCELLED'], default: 'DRAFT', index: true },
  postedAt: Date,
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

export default mongoose.model('CreditNote', creditNoteSchema);
