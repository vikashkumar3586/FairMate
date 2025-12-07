import Expense from '../models/Expense.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { updateBudgetSpent } from './budgetController.js';
import Notification from '../models/Notification.js';

// Get all expenses with filtering
export const getExpenses = async (req, res) => {
  try {
    const { category, startDate, endDate, groupId, limit = 50, page = 1 } = req.query;
    const userId = req.user._id;

    let query = {
      $or: [
        { paidBy: userId },
        { splitBetween: userId }
      ]
    };
    if (category) query.category = category;
    if (groupId) query.groupId = groupId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const skip = (page - 1) * limit;
    const expenses = await Expense.find(query)
      .populate('groupId', 'groupName')
      .populate('paidBy', 'name email')
      .populate('splitBetween', 'name email')
      .populate('individualShares.user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Expense.countDocuments(query);
    res.json({
      expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create expense (personal or group)
export const createExpense = async (req, res) => {
  try {
    const { title, amount, category, groupId, splitBetween, receiptURL } = req.body;
    const userId = req.user._id;
    // Validation
    if (!title || !amount || !category) {
      return res.status(400).json({ message: 'Title, amount, and category are required.' });
    }
    if (groupId && (!splitBetween || !Array.isArray(splitBetween) || splitBetween.length === 0)) {
      return res.status(400).json({ message: 'splitBetween must be a non-empty array for group expenses.' });
    }

    // Calculate individual shares for group expenses
    let individualShares = [];
    if (groupId && splitBetween && splitBetween.length > 0) {
      const shareAmount = parseFloat((amount / splitBetween.length).toFixed(2));
      individualShares = splitBetween.map(memberId => ({
        user: memberId,
        amount: shareAmount,
        isPaid: memberId.toString() === userId.toString() // Mark as paid if it's the person who paid
      }));
    }

    const expense = new Expense({
      title,
      amount,
      category,
      paidBy: userId,
      splitBetween: splitBetween || [],
      individualShares: individualShares,
      groupId: groupId || null,
      receiptURL: receiptURL || null
    });
    await expense.save();
    await expense.populate('groupId', 'groupName');
    await expense.populate('paidBy', 'name email');
    await expense.populate('splitBetween', 'name email');
    await expense.populate('individualShares.user', 'name email');
    
    // Update budget spent amount
    const month = expense.createdAt.toISOString().slice(0, 7);
    await updateBudgetSpent(userId, category, month, amount, 'add');

    // Create notifications for group members who owe on this expense
    if (expense.groupId && Array.isArray(expense.splitBetween) && expense.splitBetween.length > 0) {
      try {
        const payerId = expense.paidBy._id?.toString?.() || expense.paidBy.toString();
        const groupName = expense.groupId?.groupName || 'Group';

        // Build a quick lookup for individual user shares
        const shareMap = new Map();
        (expense.individualShares || []).forEach(share => {
          const uid = (share.user?._id || share.user)?.toString();
          if (uid) shareMap.set(uid, share.amount);
        });

        const notifications = [];
        for (const member of expense.splitBetween) {
          const memberId = (member?._id || member)?.toString();
          if (!memberId || memberId === payerId) continue; // skip payer

          const owed = shareMap.get(memberId) ?? (expense.amount / expense.splitBetween.length);
          const formatted = Number(owed).toFixed(2);
          const payerName = expense.paidBy?.name || 'a group member';
          const message = `You owe ₹${formatted} to ${payerName} for "${expense.title}" in ${groupName}.`;

          notifications.push({
            userId: memberId,
            message,
            type: 'reminder',
            isRead: false,
            timestamp: new Date()
          });
        }

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      } catch (notifyErr) {
        // Do not fail the main request due to notification issues
        console.error('Failed to create group expense notifications:', notifyErr);
      }
    }

    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update expense
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const expense = await Expense.findOne({ _id: id, paidBy: userId });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    ).populate('groupId', 'groupName')
     .populate('paidBy', 'name email')
     .populate('splitBetween', 'name email')
     .populate('individualShares.user', 'name email');
    res.json(updatedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete expense
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const expense = await Expense.findOne({ _id: id, paidBy: userId });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Store expense details before deletion for budget update
    const { amount, category, createdAt } = expense;
    const month = createdAt.toISOString().slice(0, 7);

    await Expense.findByIdAndDelete(id);
    
    // Update budget spent amount (subtract the deleted expense)
    await updateBudgetSpent(userId, category, month, amount, 'subtract');
    
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single expense by ID
export const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const expense = await Expense.findOne({ _id: id, $or: [{ paidBy: userId }, { splitBetween: userId }] })
      .populate('groupId', 'groupName')
      .populate('paidBy', 'name email')
      .populate('splitBetween', 'name email')
      .populate('individualShares.user', 'name email');
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export expenses as CSV
export const exportCSV = async (req, res) => {
  try {
    const { category, startDate, endDate, groupId } = req.query;
    const userId = req.user._id;

    let query = {
      $or: [
        { paidBy: userId },
        { splitBetween: userId }
      ]
    };
    if (category) query.category = category;
    if (groupId) query.groupId = groupId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate('groupId', 'groupName')
      .populate('paidBy', 'name email')
      .populate('splitBetween', 'name email')
      .populate('individualShares.user', 'name email')
      .sort({ createdAt: -1 });

    // Convert to CSV format
    const csvData = expenses.map(expense => ({
      Date: expense.createdAt.toLocaleDateString(),
      Title: expense.title,
      Category: expense.category,
      Amount: expense.amount,
      Group: expense.groupId ? expense.groupId.groupName : 'Personal',
      PaidBy: expense.paidBy.name || expense.paidBy.email
    }));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');

    // Convert to CSV string
    const csvString = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    res.send(csvString);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 

export const markShareAsPaid = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { shareIndex, userId } = req.body;
    const currentUserId = req.user._id;

    // Find the expense
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if it's a group expense
    if (!expense.groupId) {
      return res.status(400).json({ message: 'This is not a group expense' });
    }

    let targetShareIndex;
    
    // Use shareIndex if provided, otherwise find by userId
    if (shareIndex !== undefined) {
      targetShareIndex = shareIndex;
    } else if (userId) {
      targetShareIndex = expense.individualShares.findIndex(
        share => share.user.toString() === userId.toString()
      );
    } else {
      // Default to current user
      targetShareIndex = expense.individualShares.findIndex(
        share => share.user.toString() === currentUserId.toString()
      );
    }

    if (targetShareIndex === -1 || !expense.individualShares[targetShareIndex]) {
      return res.status(400).json({ message: 'User is not part of this expense split' });
    }

    if (expense.individualShares[targetShareIndex].isPaid) {
      return res.status(400).json({ message: 'Share is already marked as paid' });
    }

    // Mark the individual share as paid
    expense.individualShares[targetShareIndex].isPaid = true;
    
    // Also add to legacy paidShares array for backward compatibility
    const shareUserId = expense.individualShares[targetShareIndex].user;
    if (!expense.paidShares.includes(shareUserId)) {
      expense.paidShares.push(shareUserId);
    }

    await expense.save();

    await expense.populate('groupId', 'groupName');
    await expense.populate('paidBy', 'name email');
    await expense.populate('splitBetween', 'name email');
    await expense.populate('individualShares.user', 'name email');
    await expense.populate('paidShares', 'name email');

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user debt summary based on individual shares
export const getUserDebtSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all group expenses where the user has unpaid shares
    const expenses = await Expense.find({
      groupId: { $ne: null },
      'individualShares.user': userId
    }).populate('individualShares.user', 'name email')
      .populate('paidBy', 'name email')
      .populate('groupId', 'groupName');

    let totalYouOwe = 0;
    let totalYoureOwed = 0;
    let oweCount = 0;
    let owedCount = 0;
    const owedToUsers = new Set();
    const owedFromUsers = new Set();

    expenses.forEach(expense => {
      const userShare = expense.individualShares.find(
        share => share.user._id.toString() === userId.toString()
      );

      if (userShare) {
        // If user hasn't paid their share and they didn't pay the original expense
        if (!userShare.isPaid && expense.paidBy._id.toString() !== userId.toString()) {
          totalYouOwe += userShare.amount;
          owedToUsers.add(expense.paidBy._id.toString());
        }

        // If user paid the expense but others haven't paid their shares
        if (expense.paidBy._id.toString() === userId.toString()) {
          expense.individualShares.forEach(share => {
            if (!share.isPaid && share.user._id.toString() !== userId.toString()) {
              totalYoureOwed += share.amount;
              owedFromUsers.add(share.user._id.toString());
            }
          });
        }
      }
    });

    oweCount = owedToUsers.size;
    owedCount = owedFromUsers.size;

    res.json({
      youOwe: totalYouOwe,
      youreOwed: totalYoureOwed,
      oweCount: oweCount,
      owedCount: owedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 