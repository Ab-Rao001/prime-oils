import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  sku: { type: String, unique: true, sparse: true },
  cat: { type: String, index: true }, // Category field (indexed)
  size: String,
  description: String,
  stock: { type: Number, default: 0, index: true },
  unit: String,
  price: { type: Number, default: 0, index: true },
  costPrice: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  imageFile: String,
  imageUrl: String,
  cloudinaryPublicId: String,
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Define indexes for scalability
productSchema.index({ name: 'text', description: 'text' }); // Full-text search
productSchema.index({ supplier: 1, cat: 1 });
productSchema.index({ cat: 1, stock: 1 }); // Compound index for stock by category
productSchema.index({ isActive: 1, createdAt: -1 }); // Compound index for active recent products

export default mongoose.model('Product', productSchema);
