import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  settledAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
settlementSchema.index({ group: 1, status: 1 });
settlementSchema.index({ fromUser: 1, status: 1 });
settlementSchema.index({ toUser: 1, status: 1 });

const Settlement = mongoose.model('Settlement', settlementSchema);

export default Settlement;
