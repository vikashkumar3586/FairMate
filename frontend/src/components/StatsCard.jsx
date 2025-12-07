import React from "react";
import "./StatsCard.css";

const StatsCard = ({ 
  icon, 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  description, 
  className = "",
  formatValue = "currency",
  showChange = true,
  loading = false,
  error = false,
  budgetPercentage = null,
  onClick = null
}) => {
  
  const getChangeIcon = (type) => {
    switch (type) {
      case "up":
        return "↗️";
      case "down":
        return "↘️";
      case "neutral":
        return "→";
      default:
        return "→";
    }
  };

  const getChangeClass = (type) => {
    switch (type) {
      case "up":
        return "up";
      case "down":
        return "down";
      case "neutral":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const formatDisplayValue = (val, format) => {
    if (val === null || val === undefined) return "—";
    
    switch (format) {
      case "currency":
        return `₹${Number(val).toLocaleString('en-IN')}`;
      case "percentage":
        return `${Number(val).toFixed(1)}%`;
      case "number":
        return Number(val).toLocaleString('en-IN');
      case "decimal":
        return Number(val).toFixed(2);
      case "custom":
        return val;
      default:
        return `₹${Number(val).toLocaleString('en-IN')}`;
    }
  };

  const formatChangeValue = (changeVal, changeType) => {
    if (changeVal === null || changeVal === undefined || changeVal === 0) return "0%";
    
    const isAmount = typeof changeVal === 'number' && changeVal > 100; // Heuristic for amount vs percentage
    
    if (isAmount) {
      return `${changeType === 'up' ? '+' : ''}₹${Math.abs(changeVal).toLocaleString('en-IN')}`;
    } else {
      return `${changeType === 'up' ? '+' : ''}${Number(changeVal).toFixed(1)}%`;
    }
  };

  const shouldShowChange = showChange && (change !== null && change !== undefined && change !== 0);

  if (loading) {
    return (
      <div className={`stats-card ${className} loading`}>
        <div className="stats-header">
          <span className="stats-icon">{icon}</span>
          <span className="stats-title">{title}</span>
          <span className="stats-change loading">...</span>
        </div>
        <div className="stats-value loading">—</div>
        <div className="stats-description">{description}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`stats-card ${className} error`}>
        <div className="stats-header">
          <span className="stats-icon">⚠️</span>
          <span className="stats-title">{title}</span>
        </div>
        <div className="stats-value error">Error</div>
        <div className="stats-description">Failed to load data</div>
      </div>
    );
  }

  return (
    <div 
      className={`stats-card ${className} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stats-header">
        <span className="stats-icon">{icon}</span>
        <span className="stats-title">{title}</span>
        {shouldShowChange && (
          <span className={`stats-change ${getChangeClass(changeType)}`}>
            {getChangeIcon(changeType)} {formatChangeValue(change, changeType)}
          </span>
        )}
      </div>
      <div className="stats-value">{formatDisplayValue(value, formatValue)}</div>
      <div className="stats-description">{description}</div>
      {budgetPercentage !== null && (
        <div className="stats-budget-percentage">
          <small>{budgetPercentage.toFixed(1)}% of budget</small>
        </div>
      )}
    </div>
  );
};

export default StatsCard; 