import mongoose from 'mongoose';

const dispatchSchema = new mongoose.Schema({
  dispatchId: { type: String, required: true, unique: true, index: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  status: { type: String, enum: ['scheduled', 'in-transit', 'completed'], default: 'scheduled', index: true }, // Legacy route status
  deliveryStatus: { type: String, enum: ['ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'PARTIAL'], default: 'ASSIGNED', index: true },
  assignedAt: { type: Date },
  dispatchedAt: { type: Date },
  deliveredAt: { type: Date },
  failureReason: { type: String },
  proofOfDelivery: {
    signatureUrl: String,
    photoUrls: [String],
    receiverName: String,
    receiverPhone: String,
    notes: String,
    gpsLocation: { type: [Number] },
    uploadedAt: Date,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  departureTime: { type: Date },
  arrivalTime: { type: Date },
  notes: String
}, { timestamps: true });

dispatchSchema.index({ deliveryStatus: 1, createdAt: -1 });
dispatchSchema.index({ driver: 1, createdAt: -1 });
dispatchSchema.index({ vehicle: 1, createdAt: -1 });
dispatchSchema.index({ deliveredAt: -1 });

export default mongoose.model('Dispatch', dispatchSchema);
