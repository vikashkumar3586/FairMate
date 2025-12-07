import Group from '../models/Group.js';
import User from '../models/User.js';
import Settlement from '../models/Settlement.js';
import Expense from '../models/Expense.js';

export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({
      $or: [
        { createdBy: userId },
        { 'members.user': userId }
      ]
    })
    .populate('createdBy', 'name email')
    .populate('members.user', 'name email')
    .sort({ createdAt: -1 });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const group = await Group.findById(id)
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email');
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    // Check if user is member
    const isMember = group.members.some(member => 
      member.user._id.toString() === userId
    ) || group.createdBy._id.toString() === userId;
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getGroupById = getGroup;

export const createGroup = async (req, res) => {
  try {
    const { groupName, groupCode } = req.body;
    const userId = req.user._id;
    
    // Validate required fields
    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }
    
    let finalGroupCode = groupCode;
    
    // If no group code provided, generate one
    if (!finalGroupCode || !finalGroupCode.trim()) {
      finalGroupCode = await generateUniqueGroupCode();
    } else {
      finalGroupCode = finalGroupCode.trim().toUpperCase();
      
      // Validate group code format (alphanumeric, 6 characters)
      if (!/^[A-Z0-9]{6}$/.test(finalGroupCode)) {
        return res.status(400).json({ message: 'Group code must be exactly 6 alphanumeric characters' });
      }
      
      // Check if group code already exists
      const existingGroup = await Group.findOne({ groupCode: finalGroupCode });
      if (existingGroup) {
        return res.status(400).json({ message: 'Group code already exists. Please choose a different code.' });
      }
    }
    
    const groupData = {
      groupName: groupName.trim(),
      groupCode: finalGroupCode,
      createdBy: userId,
      members: [{ user: userId, role: 'admin' }]
    };
    
    const group = new Group(groupData);
    await group.save();
    await group.populate('createdBy', 'name email');
    await group.populate('members.user', 'name email');
    
    res.status(201).json({
      message: 'Group created successfully!',
      group: group
    });
  } catch (error) {
    console.error('Error creating group:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Group code already exists. Please choose a different code.' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

// Helper function to generate unique group codes
const generateUniqueGroupCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code already exists
    const existingGroup = await Group.findOne({ groupCode: result });
    if (!existingGroup) {
      return result;
    }
    
    attempts++;
  }
  
  throw new Error('Unable to generate unique group code. Please try again.');
};

export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    // Check if user is admin
    const isAdmin = group.createdBy.toString() === userId || 
                   group.members.some(member => 
                     member.user.toString() === userId && member.role === 'admin'
                   );
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can update groups' });
    }
    const updatedGroup = await Group.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    )
    .populate('createdBy', 'name email')
    .populate('members.user', 'name email');
    res.json(updatedGroup);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    console.log('Delete group request:', { groupId: id, userId: userId.toString() });
    
    const group = await Group.findById(id);
    if (!group) {
      console.log('Group not found:', id);
      return res.status(404).json({ message: 'Group not found' });
    }
    
    console.log('Group found:', { 
      groupId: group._id.toString(), 
      createdBy: group.createdBy.toString(),
      requestingUser: userId.toString()
    });
    
    // Only creator can delete group
    if (group.createdBy.toString() !== userId.toString()) {
      console.log('Authorization failed - not group creator');
      return res.status(403).json({ message: 'Only group creator can delete group' });
    }
    
    console.log('Authorization passed - proceeding with deletion');
    
    // Delete all expenses associated with this group
    const expenseDeleteResult = await Expense.deleteMany({ groupId: id });
    console.log('Deleted expenses:', expenseDeleteResult.deletedCount);
    
    // Delete all settlements associated with this group
    const settlementDeleteResult = await Settlement.deleteMany({ groupId: id });
    console.log('Deleted settlements:', settlementDeleteResult.deletedCount);
    
    // Delete the group itself
    await Group.findByIdAndDelete(id);
    console.log('Group deleted successfully');
    
    res.json({ message: 'Group and all associated data deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ message: `Failed to delete group: ${error.message}` });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    // Check if user is already a member
    const isMember = group.members.some(member => 
      member.user.toString() === userId
    );
    if (isMember) {
      return res.status(400).json({ message: 'Already a member of this group' });
    }
    // Add user to group
    group.members.push({
      user: userId,
      role: 'member'
    });
    await group.save();
    await group.populate('createdBy', 'name email');
    await group.populate('members.user', 'name email');
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const joinGroupByCode = async (req, res) => {
  try {
    const { groupCode } = req.params;
    const userId = req.user._id;
    
    // Find group by code
    const group = await Group.findOne({ groupCode: groupCode.toUpperCase() });
    if (!group) {
      return res.status(404).json({ message: 'Group not found. Please check the code and try again.' });
    }
    
    // Check if user is already a member
    const isMember = group.members.some(member => 
      member.user.toString() === userId
    ) || group.createdBy.toString() === userId;
    
    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this group' });
    }
    
    // Add user to group
    group.members.push({
      user: userId,
      role: 'member'
    });
    
    await group.save();
    await group.populate('createdBy', 'name email');
    await group.populate('members.user', 'name email');
    
    res.json({
      message: 'Successfully joined the group!',
      group: group
    });
  } catch (error) {
    console.error('Error joining group by code:', error);
    res.status(500).json({ message: 'Failed to join group. Please try again.' });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    // Check if user is a member
    const memberIndex = group.members.findIndex(member => 
      member.user.toString() === userId
    );
    if (memberIndex === -1) {
      return res.status(400).json({ message: 'Not a member of this group' });
    }
    // Creator cannot leave group
    if (group.createdBy.toString() === userId) {
      return res.status(400).json({ message: 'Group creator cannot leave group' });
    }
    // Remove user from group
    group.members.splice(memberIndex, 1);
    await group.save();
    res.json({ message: 'Left group successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addMember = async (req, res) => {
  try {
    const { id } = req.params; // group id
    const { userId, role = 'member' } = req.body;
    const requesterId = req.user._id;
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    // Only admin or creator can add members
    const isAdmin = group.createdBy.toString() === requesterId ||
      group.members.some(member => member.user.toString() === requesterId && member.role === 'admin');
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }
    // Check if user is already a member
    const alreadyMember = group.members.some(member => member.user.toString() === userId);
    if (alreadyMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }
    group.members.push({ user: userId, role });
    await group.save();
    await group.populate('members.user', 'name email');
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { id } = req.params; // group id
    const { userId } = req.body;
    const requesterId = req.user._id;
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    // Only admin or creator can remove members
    const isAdmin = group.createdBy.toString() === requesterId ||
      group.members.some(member => member.user.toString() === requesterId && member.role === 'admin');
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }
    // Creator cannot be removed
    if (group.createdBy.toString() === userId) {
      return res.status(400).json({ message: 'Cannot remove group creator' });
    }
    const memberIndex = group.members.findIndex(member => member.user.toString() === userId);
    if (memberIndex === -1) {
      return res.status(400).json({ message: 'User is not a member' });
    }
    group.members.splice(memberIndex, 1);
    await group.save();
    await group.populate('members.user', 'name email');
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    // Check if user is member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const isMember = group.members.some(member => member.user.toString() === userId) || group.createdBy.toString() === userId;
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }
    // Fetch all expenses for this group
    const expenses = await Expense.find({ groupId })
      .populate('paidBy', 'name email')
      .populate('splitBetween', 'name email')
      .sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    // Check if user is member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const isMember = group.members.some(member => member.user.toString() === userId) || group.createdBy.toString() === userId;
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }
    const settlements = await Settlement.find({ group: groupId })
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .sort({ createdAt: -1 });
    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createSettlement = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { toUser, amount, description } = req.body;
    const fromUser = req.user._id;

    // Check if user is member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(member => 
      member.user.toString() === fromUser
    ) || group.createdBy.toString() === fromUser;

    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const settlement = new Settlement({
      group: groupId,
      fromUser,
      toUser,
      amount,
      description
    });

    await settlement.save();
    await settlement.populate('fromUser', 'name email');
    await settlement.populate('toUser', 'name email');

    res.status(201).json(settlement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const completeSettlement = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const userId = req.user._id;

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    // Check if user is involved in this settlement
    if (settlement.fromUser.toString() !== userId && settlement.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to complete this settlement' });
    }

    settlement.status = 'completed';
    settlement.settledAt = new Date();
    await settlement.save();

    res.json({ message: 'Settlement completed successfully', settlement });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 

export const getAllSettlements = async (req, res) => {
  try {
    const userId = req.user._id;
    // Find all settlements where the user is either fromUser or toUser
    const settlements = await Settlement.find({
      $or: [
        { fromUser: userId },
        { toUser: userId }
      ]
    })
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .sort({ createdAt: -1 });
    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getGroupDebts = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Check if user is member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(member => 
      member.user.toString() === userId
    ) || group.createdBy.toString() === userId;

    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    // Get all group expenses
    const expenses = await Expense.find({ groupId })
      .populate('paidBy', 'name email')
      .populate('splitBetween', 'name email');

    // Calculate debts
    const debts = {};
    const allMembers = [...group.members.map(m => m.user), group.createdBy];

    // Initialize debt tracking for all members
    allMembers.forEach(memberId => {
      debts[memberId.toString()] = 0;
    });

    // Calculate who paid what and who owes what
    expenses.forEach(expense => {
      const paidBy = expense.paidBy._id.toString();
      const totalAmount = expense.amount;
      
      // Add what the payer paid
      debts[paidBy] += totalAmount;

      // Subtract what each person owes
      expense.splitBetween.forEach(splitUserId => {
        const shareAmount = totalAmount / expense.splitBetween.length; // Equal split
        debts[splitUserId.toString()] -= shareAmount;
      });
    });

    // Get completed settlements to adjust debts
    const completedSettlements = await Settlement.find({
      group: groupId,
      status: 'completed'
    });

    completedSettlements.forEach(settlement => {
      const fromUser = settlement.fromUser.toString();
      const toUser = settlement.toUser.toString();
      const amount = settlement.amount;

      debts[fromUser] += amount; // Debtor pays
      debts[toUser] -= amount;   // Creditor receives
    });

    // Convert to debt pairs (who owes whom)
    const debtPairs = [];
    const memberIds = Object.keys(debts);

    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        const user1Id = memberIds[i];
        const user2Id = memberIds[j];
        const user1Debt = debts[user1Id];
        const user2Debt = debts[user2Id];

        if (user1Debt > 0 && user2Debt < 0) {
          // User1 owes User2
          const amount = Math.min(user1Debt, Math.abs(user2Debt));
          debtPairs.push({
            fromUser: user1Id,
            toUser: user2Id,
            amount: amount
          });
        } else if (user1Debt < 0 && user2Debt > 0) {
          // User2 owes User1
          const amount = Math.min(Math.abs(user1Debt), user2Debt);
          debtPairs.push({
            fromUser: user2Id,
            toUser: user1Id,
            amount: amount
          });
        }
      }
    }

    // Get user details for the debt pairs
    const populatedDebts = await Promise.all(
      debtPairs.map(async (debt) => {
        const fromUser = await User.findById(debt.fromUser).select('name email');
        const toUser = await User.findById(debt.toUser).select('name email');
        return {
          ...debt,
          fromUser,
          toUser
        };
      })
    );

    res.json(populatedDebts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 