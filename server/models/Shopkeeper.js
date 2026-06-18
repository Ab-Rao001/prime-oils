import mongoose from 'mongoose';

const shopkeeperSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  owner: { type: String, index: true },
  loc: String, // Legacy location string
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  phone: { type: String, index: true },
  status: { type: String, default: 'active', index: true },
  credit: { type: Number, default: 0, index: true },
  total: { type: Number, default: 0, index: true },
  salesman: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });

// Define indexes for scalability
shopkeeperSchema.index({ location: '2dsphere' });
shopkeeperSchema.index({ status: 1, loc: 1 }); // Compound index for filtering active shopkeepers by region

export default mongoose.model('Shopkeeper', shopkeeperSchema);

