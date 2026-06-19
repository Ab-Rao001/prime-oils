import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  plateNumber: { type: String, required: true, unique: true, index: true },
  model: { type: String, required: true },
  capacity: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'maintenance'], default: 'active', index: true }
}, { timestamps: true });

export default mongoose.model('Vehicle', vehicleSchema);
