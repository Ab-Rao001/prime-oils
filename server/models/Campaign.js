import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  name: { type: String, index: true },
  budget: Number,
  spent: { type: Number, default: 0, index: true },
  start: { type: String, index: true },
  end: { type: String, index: true },
  status: { type: String, index: true },
  roi: String,
  expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
}, { timestamps: true });

// Define compound indexes for active campaigns
campaignSchema.index({ status: 1, start: -1 });

export default mongoose.model('Campaign', campaignSchema);

