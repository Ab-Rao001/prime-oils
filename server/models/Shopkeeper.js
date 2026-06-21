import mongoose from 'mongoose';

const shopkeeperSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  owner: { type: String, index: true },
  email: { type: String, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  loc: String, // Legacy location string
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  phone: { type: String, index: true },
  status: { type: String, default: 'active', index: true },
  credit: { type: Number, default: 0, index: true },
  creditLimit: { type: Number, default: 0, min: 0 },
  total: { type: Number, default: 0, index: true },
  salesman: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Define indexes for scalability
shopkeeperSchema.index({ location: '2dsphere' });

export default mongoose.model('Shopkeeper', shopkeeperSchema);
