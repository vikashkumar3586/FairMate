import React, { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import AddExpenseModal from "./AddExpenseModal";
import "./Groups.css";

const API_BASE = import.meta.env.VITE_BACKEND_URL;

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupExpenses, setGroupExpenses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newGroupData, setNewGroupData] = useState({
    groupName: "",
    groupCode: ""
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupExpenses(selectedGroup._id);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch groups");
      const data = await response.json();
      setGroups(data || []);
      if (data && data.length > 0) {
        setSelectedGroup(data[0]);
      }
    } catch (err) {
      setError("Could not load groups. Please try again.");
      toast.error("Could not load groups. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupExpenses = async (groupId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/expenses?groupId=${groupId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch group expenses");
      const data = await response.json();
      setGroupExpenses(data.expenses || []);
    } catch (err) {
      setGroupExpenses([]);
    }
  };


  // Calculate pending settlements from individual shares
  const calculatePendingSettlements = () => {
    const currentUserId = localStorage.getItem('userId');
    const pendingSettlements = [];

    groupExpenses.forEach(expense => {
      if (expense.individualShares && expense.individualShares.length > 0) {
        expense.individualShares.forEach(share => {
          // Only show shares that are not paid and not for the person who paid the expense
          if (!share.isPaid && expense.paidBy._id !== share.user._id) {
            pendingSettlements.push({
              expenseId: expense._id,
              expenseTitle: expense.title,
              fromUser: share.user,
              toUser: expense.paidBy,
              amount: share.amount,
              isCurrentUser: share.user._id === currentUserId,
              shareIndex: expense.individualShares.findIndex(s => s.user._id === share.user._id)
            });
          }
        });
      }
    });

    return pendingSettlements;
  };

  // Mark individual share as paid
  const markShareAsPaid = async (expenseId, shareIndex) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/expenses/${expenseId}/mark-paid`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shareIndex })
      });

      if (response.ok) {
        toast.success("Payment marked successfully!");
        // Refresh group expenses to update the UI
        if (selectedGroup) {
          fetchGroupExpenses(selectedGroup._id);
        }
      } else {
        throw new Error("Failed to mark payment");
      }
    } catch (error) {
      console.error("Error marking payment:", error);
      toast.error("Failed to mark payment");
    }
  };

  const createGroup = async () => {
    if (!newGroupData.groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const groupCode = newGroupData.groupCode || "";
      
      const response = await fetch(`${API_BASE}/api/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          groupName: newGroupData.groupName,
          groupCode: groupCode
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create group");
      }
      
      const data = await response.json();
      toast.success(data.message || "Group created successfully!");
      setShowCreateModal(false);
      setNewGroupData({ groupName: "", groupCode: "" });
      fetchGroups();
    } catch (err) {
      toast.error(err.message || "Could not create group. Please try again.");
    }
  };

  const joinGroup = async () => {
    if (!groupCode.trim()) {
      toast.error("Enter group code");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/groups/join/${groupCode.trim().toUpperCase()}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to join group");
      }
      
      const data = await response.json();
      fetchGroups();
      setGroupCode("");
      toast.success(data.message || "Joined group successfully!");
    } catch (err) {
      toast.error(err.message || "Could not join group. Please check the code and try again.");
    }
  };

  const onExpenseAdded = () => {
    if (selectedGroup) {
      fetchGroupExpenses(selectedGroup._id);
    }
  };

  const copyGroupCode = () => {
    if (selectedGroup?.groupCode) {
      navigator.clipboard.writeText(selectedGroup.groupCode);
      toast.success("Group code copied to clipboard!");
    }
  };

  const deleteGroup = async () => {
    if (!selectedGroup) return;
    
    // Calculate pending settlements for the confirmation dialog
    const pendingSettlements = calculatePendingSettlements();
    
    // Confirm deletion with detailed information
    const isConfirmed = window.confirm(
      `⚠️ WARNING: You are about to permanently delete "${selectedGroup.groupName}"\n\n` +
      `This will remove:\n` +
      `• All group expenses (${groupExpenses.length} expenses)\n` +
      `• All pending settlements (${pendingSettlements.length} settlements)\n` +
      `• All group data and member associations\n\n` +
      `This action cannot be undone!\n\n` +
      `Are you sure you want to continue?`
    );
    
    if (!isConfirmed) return;
    
    try {
      const token = localStorage.getItem("token");
      console.log('Attempting to delete group:', selectedGroup._id);
      console.log('Token exists:', !!token);
      
      const response = await fetch(`${API_BASE}/api/groups/${selectedGroup._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Delete response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        console.error('Delete error:', errorData);
        throw new Error(errorData.message || `Failed to delete group (${response.status})`);
      }
      
      const responseData = await response.json();
      console.log('Delete success:', responseData);
      
      toast.success("Group deleted successfully!");
      setSelectedGroup(null);
      setGroupExpenses([]);
      fetchGroups(); // Refresh the groups list
    } catch (err) {
      console.error('Delete group error:', err);
      toast.error(err.message || "Could not delete group. Please try again.");
    }
  };

  // Check if current user is the group creator
  const isGroupCreator = selectedGroup && selectedGroup.createdBy && 
    selectedGroup.createdBy._id === localStorage.getItem('userId');

  if (loading) return <div className="loading">Loading groups...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="groups-container">
      {/* Header Section */}
      <div className="groups-header">
        <div className="groups-title">
          <h1>My Groups</h1>
          <p>Manage your expense groups and settlements</p>
        </div>
        <div className="groups-actions">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="create-group-btn"
          >
            ➕ Create Group
          </button>
          <button 
            onClick={() => setShowAddExpenseModal(true)}
            className="add-expense-btn"
            disabled={!selectedGroup}
          >
            💰 Add Expense
          </button>
        </div>
      </div>

      {/* Group Selection */}
      {groups.length > 0 && (
        <div className="group-selector">
          <label>Select Group:</label>
          <select 
            value={selectedGroup?._id || ""} 
            onChange={(e) => {
              const group = groups.find(g => g._id === e.target.value);
              setSelectedGroup(group);
            }}
          >
            {groups.map(group => (
              <option key={group._id} value={group._id}>
                {group.groupName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Join Group Section */}
      <div className="join-section">
        <h3>Join a Group</h3>
        <div className="join-form">
          <input
            type="text"
            value={groupCode}
            onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
            placeholder="Enter group code (e.g., ABC123)"
            maxLength={6}
          />
          <button onClick={joinGroup} className="join-btn">
            Join Group
          </button>
        </div>
      </div>

      {/* Selected Group Details */}
      {selectedGroup && (
        <div className="group-details">
          <div className="group-info">
            <h2>{selectedGroup.groupName}</h2>
            <div className="group-code-section">
              <div className="group-code-display">
                <span className="code-label">Group Code:</span>
                <span className="group-code">{selectedGroup.groupCode}</span>
              </div>
              <div className="group-actions">
                <button onClick={copyGroupCode} className="copy-btn">
                  📋 Copy Code
                </button>
                {isGroupCreator ? (
                  <button onClick={deleteGroup} className="delete-group-btn">
                    ⚠️ Delete Group
                  </button>
                ) : (
                  <div className="delete-group-btn disabled" title="Only the group creator can delete this group">
                    🗑️ Delete Group
                  </div>
                )}
              </div>
            </div>
            <p className="group-code-hint">Share this code with others to let them join your group!</p>
          </div>

          {/* Group Members */}
          <div className="members-section">
            <h3>Members ({selectedGroup.members?.filter(member => 
              member.user._id !== selectedGroup.createdBy?._id
            ).length + (selectedGroup.createdBy ? 1 : 0)})</h3>
            <div className="members-list">
              {selectedGroup.createdBy && (
                <div className="member-card creator">
                  <div className="member-avatar">
                    {selectedGroup.createdBy.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="member-info">
                    <h4>{selectedGroup.createdBy.name}</h4>
                    <p>Creator & Admin</p>
                  </div>
                </div>
              )}
              {selectedGroup.members?.filter(member => 
                member.user._id !== selectedGroup.createdBy?._id
              ).map((member) => (
                <div key={member.user._id} className="member-card">
                  <div className="member-avatar">
                    {member.user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="member-info">
                    <h4>{member.user.name}</h4>
                    <p>{member.role}</p>
                  </div>
                </div>
              ))}
              {selectedGroup.members?.filter(member => 
                member.user._id !== selectedGroup.createdBy?._id
              ).length === 0 && selectedGroup.createdBy && (
                <p className="no-data">No other members yet. Share the group code to invite others!</p>
              )}
            </div>
          </div>

          {/* Group Expenses */}
          <div className="expenses-section">
            <div className="section-header">
              <h3>Group Expenses</h3>
              <span className="expense-count">{groupExpenses.length} expenses</span>
            </div>
            {groupExpenses.length === 0 ? (
              <p className="no-data">No expenses yet. Add the first expense!</p>
            ) : (
              <div className="expenses-list">
                {groupExpenses.map((expense) => (
                  <div key={expense._id} className="expense-card">
                    <div className="expense-header">
                      <h4>{expense.title}</h4>
                      <span className="expense-amount">₹{expense.amount?.toFixed(2)}</span>
                    </div>
                    <div className="expense-details">
                      <p>Paid by: {expense.paidBy?.name}</p>
                      <p>Split between: {expense.splitBetween?.length || 0} people</p>
                      <p>Date: {new Date(expense.createdAt).toLocaleDateString()}</p>
                      {expense.individualShares && expense.individualShares.length > 0 && (
                        <div className="individual-shares">
                          <h5>Individual Shares:</h5>
                          <div className="shares-list">
                            {expense.individualShares.map((share, index) => (
                              <div key={index} className={`share-item ${share.isPaid ? 'paid' : 'unpaid'}`}>
                                <span className="member-name">
                                  {share.user?.name || share.user?.email || 'Unknown'}
                                </span>
                                <span className="share-amount">₹{share.amount?.toFixed(2)}</span>
                                <span className={`payment-status ${share.isPaid ? 'paid' : 'pending'}`}>
                                  {share.isPaid ? '✓ Paid' : '⏳ Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settlements */}
          <div className="settlements-section">
            <h3>Pending Settlements</h3>
            {(() => {
              const pendingSettlements = calculatePendingSettlements();
              return pendingSettlements.length === 0 ? (
                <p className="no-data">No pending settlements.</p>
              ) : (
                <div className="settlements-list">
                  {pendingSettlements.map((settlement, index) => (
                    <div key={`${settlement.expenseId}-${settlement.shareIndex}`} className="settlement-card">
                      <div className="settlement-info">
                        <div className="settlement-details">
                          <span className="settlement-text">
                            <strong>{settlement.fromUser?.name}</strong> owes <strong>{settlement.toUser?.name}</strong>
                          </span>
                          <span className="expense-title">for "{settlement.expenseTitle}"</span>
                        </div>
                        <span className="settlement-amount">₹{settlement.amount?.toFixed(2)}</span>
                      </div>
                      {settlement.isCurrentUser ? (
                        <button 
                          className="pay-now-btn"
                          onClick={() => markShareAsPaid(settlement.expenseId, settlement.shareIndex)}
                        >
                          Pay Now
                        </button>
                      ) : (
                        <button className="mark-paid-btn" disabled>
                          Pending
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Group</h3>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  value={newGroupData.groupName}
                  onChange={(e) => setNewGroupData({...newGroupData, groupName: e.target.value})}
                  placeholder="Enter group name"
                />
              </div>
              <div className="form-group">
                <label>Group Code (optional)</label>
                <input
                  type="text"
                  value={newGroupData.groupCode}
                  onChange={(e) => setNewGroupData({...newGroupData, groupCode: e.target.value.toUpperCase()})}
                  placeholder="Leave empty for auto-generation"
                  maxLength={6}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCreateModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={createGroup} className="create-btn">
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpenseModal && selectedGroup && (
        <AddExpenseModal
          isOpen={showAddExpenseModal}
          onClose={() => setShowAddExpenseModal(false)}
          onExpenseAdded={onExpenseAdded}
          groups={[selectedGroup]}
          preselectedGroup={selectedGroup._id}
        />
      )}
    </div>
  );
};

export default Groups; 