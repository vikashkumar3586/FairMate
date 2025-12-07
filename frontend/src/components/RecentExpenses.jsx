import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import "./RecentExpenses.css";
const API_BASE = import.meta.env.VITE_BACKEND_URL;

const RecentExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/expenses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setExpenses(data.expenses || []);
    } catch (e) {
      toast.error("Failed to load recent expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  if (loading) return <div className="recent-expenses">Loading...</div>;

  return (
    <div className="recent-expenses">
      <div className="expenses-header">
        <div>
          <h2>Recent Expenses</h2>
          <span className="expenses-sub">Your latest transactions</span>
        </div>
        <div className="expenses-actions">
          <button 
            onClick={fetchExpenses} 
            className="refresh-btn"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <button 
            onClick={() => navigate('/expenses')} 
            className="view-all-btn"
          >
            View All
          </button>
        </div>
      </div>
      <div className="expenses-list">
        {expenses.map((expense) => (
          <div className="expense-item" key={expense._id || expense.id}>
            <div className="expense-left">
              <div className="expense-main">
                <div className="expense-title">{expense.title}</div>
                <div className="expense-meta">
                  {new Date(expense.createdAt).toLocaleDateString()} • Paid by {expense.paidBy?.name || expense.paidBy?.email || 'Unknown'} • Split with {expense.splitBetween?.map(u => u.name || u.email || u).join(', ')}
                </div>
              </div>
              <div className="expense-tags">
                <span className={`expense-tag ${expense.category?.toLowerCase()}`}>{expense.category}</span>
                {expense.groupId && <span className="expense-tag group">Group</span>}
                {!expense.groupId && <span className="expense-tag personal">Personal</span>}
              </div>
            </div>
            <div className="expense-right">
              <div className="expense-amount">₹{expense.amount}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentExpenses;
