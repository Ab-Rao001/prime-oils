import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Expense from './models/Expense.js';

async function testExpense() {
  await connectDB();
  try {
    const expense = await Expense.create({
      amount: 100,
      category: 'Marketing',
      description: 'Test Spend',
      loggedBy: new mongoose.Types.ObjectId() // Mock user ID
    });
    console.log('Expense created successfully:', expense);
  } catch (err) {
    console.error('Expense Creation Failed:', err);
  } finally {
    mongoose.disconnect();
  }
}

testExpense();
