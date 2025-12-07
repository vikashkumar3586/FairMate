import Budget from '../models/Budget.js';
import Expense from '../models/Expense.js';
import Notification from '../models/Notification.js';

export const getBudgets = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month } = req.query;
    let query = { userId };
    if (month) query.month = month;
    const budgets = await Budget.find(query).sort({ category: 1 });
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const budget = await Budget.findOne({ _id: id, userId });
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    res.json(budget);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createBudget = async (req, res) => {
  try {
    const { category, limit, month, alerts } = req.body;
    const userId = req.user._id;
    
    // Check if budget already exists for this category and month
    const existingBudget = await Budget.findOne({ userId, category, month });
    
    if (existingBudget) {
      return res.status(400).json({ message: 'Budget already exists for this category and month' });
    }
    
    const budget = new Budget({ userId, category, limit, month, alerts });
    await budget.save();
    
    res.status(201).json(budget);
  } catch (error) {
    console.error('Error creating budget:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Budget already exists for this category and month' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

export const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const budget = await Budget.findOne({ _id: id, userId });
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    const updatedBudget = await Budget.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedBudget);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const budget = await Budget.findOne({ _id: id, userId });
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    await Budget.findByIdAndDelete(id);
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBudgetVsActual = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ message: 'Month parameter is required' });
    }
    
    // Get budgets for the month
    const budgets = await Budget.find({ userId, month });
    
    // Get expenses for the month (user is payer or in splitBetween)
    const startDate = new Date(month + '-01');
    const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1) - 1);
    
    const expenses = await Expense.find({
      category: { $in: budgets.map(b => b.category) },
      createdAt: { $gte: startDate, $lte: endDate },
      $or: [
        { paidBy: userId },
        { splitBetween: userId }
      ]
    });
    
    // Calculate actual spending by category (user's personal share)
    const actualSpending = {};
    expenses.forEach(expense => {
      let userAmount = 0;
      
      if (!expense.groupId) {
        // Personal expense - full amount if user paid it
        if (expense.paidBy.toString() === userId.toString()) {
          userAmount = expense.amount;
        }
      } else {
        // Group expense - calculate user's share
        if (expense.individualShares && expense.individualShares.length > 0) {
          const userShare = expense.individualShares.find(share => {
            const shareUserId = share.user?._id || share.user;
            return shareUserId?.toString() === userId?.toString();
          });
          if (userShare) {
            userAmount = userShare.amount;
          }
        } else if (expense.splitBetween && expense.splitBetween.length > 0) {
          // Fallback: calculate equal split if individualShares missing
          const isUserInSplit = expense.splitBetween.some(member => {
            const memberId = member?._id || member;
            return memberId?.toString() === userId?.toString();
          });
          if (isUserInSplit) {
            userAmount = parseFloat((expense.amount / expense.splitBetween.length).toFixed(2));
          }
        }
      }
      
      if (userAmount > 0) {
        if (actualSpending[expense.category]) {
          actualSpending[expense.category] += userAmount;
        } else {
          actualSpending[expense.category] = userAmount;
        }
      }
    });
    
    // Combine budget and actual data
    const budgetVsActual = budgets.map(budget => {
      const actual = actualSpending[budget.category] || 0;
      const percentage = budget.limit > 0 ? (actual / budget.limit) * 100 : 0;
      const status = percentage >= 100 ? 'exceeded' : 
                    percentage >= (budget.alerts?.threshold || 80) ? 'warning' : 'normal';
      return {
        category: budget.category,
        budget: budget.limit,
        actual,
        remaining: budget.limit - actual,
        percentage: Math.round(percentage * 100) / 100,
        status,
        alert: budget.alerts?.enabled && percentage >= (budget.alerts?.threshold || 80)
      };
    });
    
    // Add categories that have spending but no budget
    Object.keys(actualSpending).forEach(category => {
      const hasBudget = budgets.some(budget => budget.category === category);
      if (!hasBudget) {
        budgetVsActual.push({
          category,
          budget: 0,
          actual: actualSpending[category],
          remaining: -actualSpending[category],
          percentage: 0,
          status: 'no-budget',
          alert: false
        });
      }
    });
    
    res.json(budgetVsActual);
  } catch (error) {
    console.error('Error in getBudgetVsActual:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getBudgetAlerts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ message: 'Month parameter is required' });
    }
    // Get budgets with alerts enabled
    const budgets = await Budget.find({ userId, month, 'alerts.enabled': true });
    // Get expenses for the month (user is payer or in splitBetween)
    const startDate = new Date(month + '-01');
    const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1) - 1);
    const expenses = await Expense.find({
      createdAt: { $gte: startDate, $lte: endDate },
      $or: [
        { paidBy: userId },
        { splitBetween: userId }
      ]
    });
    // Calculate actual spending by category
    const actualSpending = {};
    expenses.forEach(expense => {
      if (actualSpending[expense.category]) {
        actualSpending[expense.category] += expense.amount;
      } else {
        actualSpending[expense.category] = expense.amount;
      }
    });
    // Find budgets that need alerts
    const alerts = budgets
      .map(budget => {
        const actual = actualSpending[budget.category] || 0;
        const percentage = budget.limit > 0 ? (actual / budget.limit) * 100 : 0;
        if (percentage >= (budget.alerts?.threshold || 80)) {
          return {
            category: budget.category,
            budget: budget.limit,
            actual,
            percentage: Math.round(percentage * 100) / 100,
            threshold: budget.alerts?.threshold || 80,
            type: percentage >= 100 ? 'exceeded' : 'warning'
          };
        }
        return null;
      })
      .filter(alert => alert !== null);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBudgetSpent = async (userId, category, month, amount, operation = 'add') => {
  try {
    const budget = await Budget.findOne({
      userId: userId,
      category,
      month
    });

    if (budget) {
      const prevSpent = budget.spentThisMonth || 0;
      const limit = budget.limit || 0;
      const thresholdPct = budget.alerts?.threshold ?? 80;
      const alertsEnabled = !!budget.alerts?.enabled;

      // Compute new spent value
      let newSpent = prevSpent;
      if (operation === 'add') {
        newSpent += amount;
      } else if (operation === 'subtract') {
        newSpent = Math.max(0, newSpent - amount);
      }

      // Save new spent value
      budget.spentThisMonth = newSpent;
      await budget.save();

      // Determine threshold crossings only when increasing spend and alerts are enabled
      if (alertsEnabled && operation === 'add' && limit > 0) {
        const prevPct = (prevSpent / limit) * 100;
        const newPct = (newSpent / limit) * 100;

        // Low budget warning crossing
        if (prevPct < thresholdPct && newPct >= thresholdPct && newPct < 100) {
          const remaining = Math.max(0, limit - newSpent).toFixed(2);
          const pct = Math.round(newPct);
          const message = `Heads up! You've used ${pct}% of your ${category} budget for ${month}. Only ₹${remaining} left.`;
          try {
            await Notification.create({
              userId,
              message,
              type: 'reminder',
              isRead: false,
              timestamp: new Date()
            });
          } catch (e) {
            console.error('Failed to create low budget notification:', e);
          }
        }

        // Budget exceeded crossing
        if (prevPct < 100 && newPct >= 100) {
          const over = Math.max(0, newSpent - limit).toFixed(2);
          const message = `Alert! You've exceeded your ${category} budget for ${month} by ₹${over}.`;
          try {
            await Notification.create({
              userId,
              message,
              type: 'alert',
              isRead: false,
              timestamp: new Date()
            });
          } catch (e) {
            console.error('Failed to create budget exceeded notification:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error updating budget spent:', error);
  }
};

export const getMonthlySummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ message: 'Month parameter is required' });
    }
    // Get all budgets for the month
    const budgets = await Budget.find({ userId, month });
    // Get expenses for the month (user is payer or in splitBetween)
    const startDate = new Date(month + '-01');
    const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1) - 1);
    const expenses = await Expense.find({
      createdAt: { $gte: startDate, $lte: endDate },
      $or: [
        { paidBy: userId },
        { splitBetween: userId }
      ]
    });
    // Calculate totals
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0);
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalRemaining = totalBudget - totalSpent;
    // Calculate by category
    const categoryBreakdown = budgets.map(budget => {
      const categoryExpenses = expenses.filter(exp => exp.category === budget.category);
      const categorySpent = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      return {
        category: budget.category,
        budget: budget.limit,
        spent: categorySpent,
        remaining: budget.limit - categorySpent,
        percentage: budget.limit > 0 ? (categorySpent / budget.limit) * 100 : 0
      };
    });
    res.json({
      month,
      totalBudget,
      totalSpent,
      totalRemaining,
      categoryBreakdown,
      budgetCount: budgets.length,
      expenseCount: expenses.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 

export const getBudgetById = getBudget; 