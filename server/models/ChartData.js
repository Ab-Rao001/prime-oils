import mongoose from 'mongoose';

const chartDataSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  data: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export default mongoose.model('ChartData', chartDataSchema);
