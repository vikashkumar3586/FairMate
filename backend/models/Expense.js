import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Education', 'Other']
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  splitBetween: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Individual share amounts for each member
  individualShares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    isPaid: {
      type: Boolean,
      default: false
    }
  }],
  paidShares: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
  }],
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  receiptURL: {
    type: String, // File path or URL for uploaded receipt
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

expenseSchema.index({ paidBy: 1, createdAt: -1 });
expenseSchema.index({ groupId: 1, createdAt: -1 });
expenseSchema.index({ category: 1, createdAt: -1 });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense; 