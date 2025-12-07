import React, { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import AddExpenseModal from "./AddExpenseModal";
import "./MyExpenses.css";

const API_BASE = import.meta.env.VITE_BACKEND_URL;

const MyExpenses = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetchExpenses();
    fetchGroups();
  }, [searchTerm, categoryFilter]);

  const fetchExpenses = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      const response = await fetch(`${API_BASE}/api/expenses?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const data = await response.json();
      setExpenses(data.expenses || []);
    } catch (err) {
      setError("Could not load expenses. Please try again.");
      toast.error("Could not load expenses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const groupsData = await response.json();
        setGroups(groupsData);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const deleteExpense = async (expenseId) => {
    if (!window.confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to delete expense");
      
      toast.success("Expense deleted successfully!");
      fetchExpenses(); // Refresh the list
    } catch (err) {
      toast.error("Failed to delete expense. Please try again.");
    }
  };

  const clearAllExpenses = async () => {
    if (!window.confirm("Are you sure you want to delete ALL expenses? This action cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      
      // Delete all expenses one by one
      const deletePromises = expenses.map(expense => 
        fetch(`${API_BASE}/api/expenses/${expense._id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      );

      await Promise.all(deletePromises);
      toast.success("All expenses cleared successfully!");
      fetchExpenses(); // Refresh the list
    } catch (err) {
      toast.error("Failed to clear expenses. Please try again.");
    }
  };

  const onExpenseAdded = () => {
    fetchExpenses(); // Refresh data when new expense is added
  };

  return (
    <div className="expenses-container">
      <div className="expenses-header">
        <div className="expenses-title">
          <h1>My Expenses</h1>
          <p>Track and manage all your personal and group expenses</p>
        </div>
        <div className="expenses-actions">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="add-expense-btn btn btn-green"
          >
            ➕ Add Expense
          </button>
          <button 
            onClick={fetchExpenses} 
            className="refresh-btn btn btn-blue"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          {expenses.length > 0 && (
            <button 
              onClick={clearAllExpenses} 
              className="clear-btn btn btn-red"
            >
              🗑️ Clear All
            </button>
          )}
        </div>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search expenses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
            <option value="Food">Food</option>
          <option value="Bills">Bills</option>
            <option value="Entertainment">Entertainment</option>
          </select>
        </div>

      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Type</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Receipt</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <React.Fragment key={expense._id}>
                <tr>
                  <td>{expense.title}</td>
                  <td>{expense.category}</td>
                  <td>{expense.groupId ? 'Group' : 'Personal'}</td>
                  <td>{new Date(expense.createdAt).toLocaleDateString()}</td>
                  <td>₹{expense.amount?.toFixed(2)}</td>
                  <td>{expense.receiptURL ? <a href={expense.receiptURL.startsWith('http') ? expense.receiptURL : `${API_BASE}${expense.receiptURL}`} target="_blank" rel="noopener noreferrer">📎</a> : "—"}</td>
                  <td>
                    <button 
                      onClick={() => deleteExpense(expense._id)}
                      className="delete-btn btn btn-red"
                      title="Delete expense"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
                {expense.groupId && expense.individualShares && expense.individualShares.length > 0 && (
                  <tr className="individual-shares-row">
                    <td colSpan="7">
                      <div className="individual-shares-table">
                        <h5>Individual Shares:</h5>
                        <div className="shares-grid">
                          {expense.individualShares.map((share, index) => (
                            <div key={index} className={`share-item-table ${share.isPaid ? 'paid' : 'unpaid'}`}>
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
                    </td>
                  </tr>
                )}
              </React.Fragment>
          ))}
          </tbody>
        </table>
      )}

      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onExpenseAdded={onExpenseAdded}
        groups={groups}
      />
    </div>
  );
};

export default MyExpenses; 