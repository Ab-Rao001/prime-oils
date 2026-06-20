import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  category: { 
    type: String, 
    enum: ['Fuel', 'Salary', 'Maintenance', 'Rent', 'Utilities', 'Marketing', 'Other'], 
    required: true,
    index: true 
  },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now, index: true },
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

expenseSchema.index({ date: -1, category: 1 });

export default mongoose.model('Expense', expenseSchema);
