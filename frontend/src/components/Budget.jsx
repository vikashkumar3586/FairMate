import React, { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import "./Budget.css";
const API_BASE = import.meta.env.VITE_BACKEND_URL;

const Budget = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newBudget, setNewBudget] = useState({ category: "", limit: "" });

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      // Fetch budget vs actual data
      const response = await fetch(`${API_BASE}/api/budgets/vs-actual?month=${currentMonth}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error("Failed to fetch budgets");
      const data = await response.json();
      setBudgets(data || []);
    } catch (err) {
      setError("Could not load budgets. Please try again.");
      toast.error("Could not load budgets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addBudget = async () => {
    if (!newBudget.category || !newBudget.limit) {
      toast.error("Please fill in all fields");
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/budgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: newBudget.category,
          limit: parseFloat(newBudget.limit),
          month: new Date().toISOString().slice(0, 7)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add budget");
      }
      
      const data = await response.json();
      setNewBudget({ category: "", limit: "" });
      fetchBudgets();
      toast.success("Budget added successfully!");
    } catch (err) {
      console.error('Budget creation error:', err);
      toast.error(err.message || "Could not add budget. Please try again.");
    }
  };

  const clearAllBudgets = async () => {
    if (!window.confirm("Are you sure you want to clear all budgets? This action cannot be undone.")) {
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      // Get all budgets for current month
      const response = await fetch(`${API_BASE}/api/budgets?month=${currentMonth}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error("Failed to fetch budgets for deletion");
      const budgetsToDelete = await response.json();
      
      // Delete each budget
      const deletePromises = budgetsToDelete.map(budget => 
        fetch(`${API_BASE}/api/budgets/${budget._id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      );
      
      await Promise.all(deletePromises);
      fetchBudgets();
      toast.success("All budgets cleared successfully!");
    } catch (err) {
      toast.error("Failed to clear budgets. Please try again.");
    }
  };

  const getStatus = (spent, budgeted) => {
    const percent = (spent / budgeted) * 100;
    if (percent > 100) return { status: "Over", class: "status-red" };
    if (percent > 80) return { status: "Warning", class: "status-yellow" };
    return { status: "Good", class: "status-green" };
  };

  const totalBudgeted = budgets.reduce((sum, b) => sum + (b.budget || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.actual || 0), 0);
  const overBudgetCount = budgets.filter(b => (b.actual || 0) > (b.budget || 0)).length;
  const onTrackCount = budgets.filter(b => (b.actual || 0) <= (b.budget || 0) * 0.8).length;

  return (
    <div className="budget-container">
      <header className="budget-header">
        <div className="budget-header-content">
          <div>
            <h1>Budget Planning</h1>
            <p>Set spending limits and track your progress</p>
          </div>
          <div className="budget-actions">
            <button 
              onClick={fetchBudgets} 
              className="refresh-btn"
              disabled={loading}
            >
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
            {budgets.length > 0 && (
              <button 
                onClick={clearAllBudgets} 
                className="clear-btn"
              >
                🗑️ Clear All
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="summary-cards">
          <div className="summary-card">
          <p>Total Budget</p>
          <h3>₹{totalBudgeted.toFixed(2)}</h3>
            </div>
        <div className="summary-card">
          <p>Total Spent</p>
          <h3>₹{totalSpent.toFixed(2)}</h3>
          <small>{totalBudgeted > 0 ? ((totalSpent / totalBudgeted) * 100).toFixed(1) : 0}% of budget</small>
          </div>
          <div className="summary-card">
          <p>Over Budget</p>
          <h3>{overBudgetCount}</h3>
          <small>categories</small>
          </div>
          <div className="summary-card">
          <p>On Track</p>
          <h3>{onTrackCount}</h3>
          <small>categories</small>
        </div>
          </div>

      <div className="new-budget">
        <h2>Set New Budget</h2>
        <div className="form-row">
          <select
            value={newBudget.category}
            onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
          >
            <option value="">Select Category</option>
            <option value="Food">🍕 Food</option>
            <option value="Bills">💡 Bills</option>
            <option value="Entertainment">🎬 Entertainment</option>
            <option value="Transport">🚗 Transport</option>
            <option value="Shopping">🛒 Shopping</option>
            <option value="Healthcare">⚕️ Healthcare</option>
            <option value="Education">🎓 Education</option>
            <option value="Other">📦 Other</option>
          </select>
          <input
            type="number"
            placeholder="Amount"
            value={newBudget.limit}
            onChange={(e) => setNewBudget({ ...newBudget, limit: e.target.value })}
          />
          <button onClick={addBudget}>Add</button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="budget-grid">
          {budgets.map((b) => {
            const percent = ((b.actual || 0) / (b.budget || 1)) * 100;
            const status = getStatus(b.actual || 0, b.budget || 1);
              return (
              <div className="budget-card" key={b.category}>
                <div className="budget-card-header">
                  <span className="emoji">{b.icon || ""}</span>
                  <h4>{b.category}</h4>
                  <span className={`status ${status.class}`}>{status.status}</span>
                  </div>
                <p>Spent: ₹{b.actual || 0}</p>
                <p>Budget: ₹{b.budget}</p>
                <div className="progress-bar">
                  <div
                    className="progress"
                    style={{
                      width: `${Math.min(percent, 100)}%`,
                      backgroundColor: percent > 100 ? "#e74c3c" : percent > 80 ? "#f39c12" : "#2ecc71",
                    }}
                  ></div>
                  </div>
                <small>
                  {percent.toFixed(1)}% used • {b.actual > b.budget ? `${(b.actual - b.budget).toFixed(2)} over` : `${(b.budget - (b.actual || 0)).toFixed(2)} left`}
                </small>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default Budget; 
