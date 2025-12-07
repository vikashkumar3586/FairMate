import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: { 
    type: String, 
    required: false, // Optional to support OAuth-based accounts
    default: ''
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    default: '',
    trim: true
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  googleId: {
    type: String,
    default: ''
  },
  // Email change verification fields
  newEmailPending: {
    type: String,
    default: ''
  },
  emailChangeToken: {
    type: String,
    default: ''
  },
  emailChangeExpires: {
    type: Date,
    default: null
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  personalExpenses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    return false;
  }
  
  if (!candidatePassword) {
    return false;
  }
  
  try {
    const result = await bcrypt.compare(candidatePassword, this.passwordHash);
    return result;
  } catch (error) {
    console.error('Error comparing password:', error);
    return false;
  }
};

const User = mongoose.model("User", UserSchema);
export default User;
 