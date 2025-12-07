import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatsCard from "./StatsCard";
import RecentExpenses from "./RecentExpenses";
import AddExpenseModal from "./AddExpenseModal";
import "./Dashboard.css";

const API_BASE = import.meta.env.VITE_BACKEND_URL;

const Dashboard = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    personalSpending: 0,
    groupExpenses: 0,
    youOwe: 0,
    youreOwed: 0,
    personalChange: 0,
    groupChange: 0,
    oweChange: 0,
    owedChange: 0,
    oweCount: 0,
    owedCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [currentMonth] = useState(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  const [userName, setUserName] = useState('User');
  const [expenses, setExpenses] = useState([]);
  const [budgetData, setBudgetData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    const storedName = localStorage.getItem('userName');
    if (storedName) setUserName(storedName);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      // Fetch all expenses
      const expensesResponse = await fetch(`${API_BASE}/api/expenses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      let allExpenses = [];
      if (expensesResponse.ok) {
        const data = await expensesResponse.json();
        allExpenses = data.expenses || [];
        setExpenses(allExpenses);
      }

      // Fetch groups
      const groupsResponse = await fetch(`${API_BASE}/api/groups`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      let groupsData = []; // Declare outside the if block
      if (groupsResponse.ok) {
        const groupsResponseData = await groupsResponse.json();
        groupsData = groupsResponseData || [];
        setGroups(groupsData);
      }

      // Calculate stats
      const calculatedStats = calculateStats(allExpenses, userId);
      
      // Fetch debt information
      const debtInfo = await fetchDebtInfo(token);
      
      // Fetch budget data for percentage calculation
      const budgetResponse = await fetch(`${API_BASE}/api/budgets/vs-actual?month=${new Date().toISOString().slice(0, 7)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (budgetResponse.ok) {
        const budgetResponseData = await budgetResponse.json();
        setBudgetData(budgetResponseData || []);
      }
      
      // Always use the correct calculatePersonalSpending logic
      // Don't override with budget data as it includes full group expense amounts
      setStats({
        ...calculatedStats,
        ...debtInfo
      });

      // Calculate chart data
      calculateChartData(allExpenses);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (allExpenses, userId) => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    // Filter for current month
    const isThisMonth = (dateStr) => {
      const d = new Date(dateStr);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    };

    // Filter for last month
    const isLastMonth = (dateStr) => {
      const d = new Date(dateStr);
      return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
    };

    // Current month expenses
    const personalThisMonth = allExpenses.filter(e => !e.groupId && e.paidBy?._id === userId && isThisMonth(e.createdAt));
    const groupThisMonth = allExpenses.filter(e => e.groupId && isThisMonth(e.createdAt));
    
    // Last month expenses
    const personalLastMonth = allExpenses.filter(e => !e.groupId && e.paidBy?._id === userId && isLastMonth(e.createdAt));
    const groupLastMonth = allExpenses.filter(e => e.groupId && isLastMonth(e.createdAt));

    // Calculate personal spending: personal expenses + user's share from group expenses
    const calculatePersonalSpending = (personalExpenses, groupExpenses) => {
      let total = 0;
      
      // Add personal expenses (full amount for expenses paid by user)
      personalExpenses.forEach(expense => {
        if (expense.paidBy?._id === userId) {
          total += expense.amount;
        }
      });
      
      // Add user's individual share from group expenses
      groupExpenses.forEach(expense => {
        if (expense.individualShares && expense.individualShares.length > 0) {
          const userShare = expense.individualShares.find(share => {
            const shareUserId = share.user?._id || share.user;
            return shareUserId?.toString() === userId?.toString();
          });
          if (userShare) {
            total += userShare.amount;
          }
        } else if (expense.splitBetween && expense.splitBetween.length > 0) {
          // Fallback: calculate equal split if individualShares missing
          const isUserInSplit = expense.splitBetween.some(member => {
            const memberId = member?._id || member;
            return memberId?.toString() === userId?.toString();
          });
          if (isUserInSplit) {
            const shareAmount = parseFloat((expense.amount / expense.splitBetween.length).toFixed(2));
            total += shareAmount;
          }
        }
      });
      
      return total;
    };

    // Calculate totals using the new logic
    const totalPersonalThisMonth = calculatePersonalSpending(personalThisMonth, groupThisMonth);
    const totalGroupThisMonth = groupThisMonth.reduce((sum, e) => sum + e.amount, 0);
    const totalPersonalLastMonth = calculatePersonalSpending(personalLastMonth, groupLastMonth);
    const totalGroupLastMonth = groupLastMonth.reduce((sum, e) => sum + e.amount, 0);

    // Calculate percentage changes
    const personalChange = totalPersonalLastMonth > 0 
      ? ((totalPersonalThisMonth - totalPersonalLastMonth) / totalPersonalLastMonth) * 100 
      : 0;
    
    const groupChange = totalGroupLastMonth > 0 
      ? ((totalGroupThisMonth - totalGroupLastMonth) / totalGroupLastMonth) * 100 
      : 0;

    return {
      personalSpending: totalPersonalThisMonth,
      groupExpenses: totalGroupThisMonth,
      personalChange: personalChange,
      groupChange: groupChange
    };
  };

  const fetchDebtInfo = async (token) => {
    try {
      // Fetch debt summary based on individual shares
      const debtResponse = await fetch(`${API_BASE}/api/expenses/debt-summary`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (debtResponse.ok) {
        const debtData = await debtResponse.json();
        
        // For now, we'll use simple change values
        // In a real app, you'd compare with previous month's debt
        const oweChange = debtData.youOwe > 0 ? 100 : 0; // Placeholder
        const owedChange = debtData.youreOwed > 0 ? 50 : 0; // Placeholder

        return {
          youOwe: debtData.youOwe,
          youreOwed: debtData.youreOwed,
          oweCount: debtData.oweCount,
          owedCount: debtData.owedCount,
          oweChange: oweChange,
          owedChange: owedChange
        };
      } else {
        throw new Error('Failed to fetch debt summary');
      }
    } catch (error) {
      console.error('Error fetching debt info:', error);
      return {
        youOwe: 0,
        youreOwed: 0,
        oweCount: 0,
        owedCount: 0,
        oweChange: 0,
        owedChange: 0
      };
    }
  };

  const calculateChartData = (allExpenses) => {
    // Category-wise data
    const categoryMap = {};
    allExpenses.forEach(expense => {
      if (!categoryMap[expense.category]) categoryMap[expense.category] = 0;
      categoryMap[expense.category] += expense.amount;
    });
    // Monthly trend data
    const monthlyMap = {};
    allExpenses.forEach(expense => {
      const monthKey = new Date(expense.createdAt).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = 0;
      monthlyMap[monthKey] += expense.amount;
    });
  };

  const getChangeType = (change) => {
    if (change === 0) return 'neutral';
    return change > 0 ? 'up' : 'down';
  };

  const calculateBudgetPercentage = () => {
    if (budgetData.length === 0) return null;
    
    const totalBudgeted = budgetData.reduce((sum, b) => sum + (b.budget || 0), 0);
    if (totalBudgeted === 0) return null;
    
    return (stats.personalSpending / totalBudgeted) * 100;
  };

  // Navigation functions for Quick Actions
  const handleNavigateToExpenses = () => {
    navigate('/expenses');
  };

  const handleNavigateToGroups = () => {
    navigate('/group');
  };

  const onExpenseAdded = () => {
    fetchDashboardData(); // Refresh data when new expense is added
  };

  if (loading) {
    return (
      <div className="dashboard-root">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-root">
      <main className="dashboard-main">
        {/* Welcome Section */}
        <section className="dashboard-welcome">
          <h1>Welcome back, {userName}! <span className="wave">👋</span></h1>
          <p>Here's your expense summary for {currentMonth}</p>
        </section>

        {/* Stats Cards Section */}
            <section className="dashboard-summary">
              <StatsCard
            icon="💼"
                title="Personal Spending"
            value={stats.personalSpending}
            change={stats.personalChange}
                changeType={getChangeType(stats.personalChange)}
                description="This month"
            formatValue="currency"
            loading={loading}
            onClick={handleNavigateToExpenses}
              />
              <StatsCard
                icon="👥"
                title="Group Expenses"
            value={stats.groupExpenses}
            change={stats.groupChange}
                changeType={getChangeType(stats.groupChange)}
                description="Shared this month"
            formatValue="currency"
            loading={loading}
            onClick={handleNavigateToGroups}
              />
              <StatsCard
                icon="↗️"
                title="You Owe"
            value={stats.youOwe}
            change={stats.oweChange}
            changeType={getChangeType(stats.oweChange)}
            description={`To ${stats.oweCount} people`}
            className="owe-card"
            formatValue="currency"
            loading={loading}
            onClick={handleNavigateToGroups}
              />
              <StatsCard
                icon="↙️"
                title="You're Owed"
            value={stats.youreOwed}
            change={stats.owedChange}
            changeType={getChangeType(stats.owedChange)}
            description={`From ${stats.owedCount} people`}
            className="owed-card"
            formatValue="currency"
            loading={loading}
            onClick={handleNavigateToGroups}
              />
            </section>

        {/* Main Content Area - Two Columns */}
        <section className="dashboard-content">
          {/* Left Column - Recent Expenses */}
          <div className="dashboard-left">
              <RecentExpenses />
          </div>

          {/* Right Column - Quick Actions */}
          <div className="dashboard-right">
            <div className="dashboard-actions">
              <h2>Quick Actions</h2>
              <button className="action-btn primary" onClick={() => setIsModalOpen(true)}>
                ➕ Add Expense
              </button>
              <button className="action-btn" onClick={handleNavigateToGroups}>
                👥 Create Group
              </button>
            </div>
          </div>
        </section>
      </main>

      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onExpenseAdded={onExpenseAdded}
        groups={groups}
      />
    </div>
  );
};

export default Dashboard; 