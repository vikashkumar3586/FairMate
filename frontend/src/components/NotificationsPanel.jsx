import React from "react";
import { Check, BellOff } from "lucide-react";

const NotificationsPanel = ({
  notifications = [],
  loading,
  onMarkAllRead,
  onItemClick,
  onRefresh,
}) => {
  return (
    <div className="notifications-panel" role="dialog" aria-label="Notifications">
      <div className="notifications-header">
        <div className="title">Notifications</div>
        <div className="actions">
          <button className="link-btn" onClick={onRefresh} title="Refresh">
            Refresh
          </button>
          <button className="link-btn" onClick={onMarkAllRead} title="Mark all as read">
            <Check size={14} /> Mark all read
          </button>
        </div>
      </div>

      <div className="notifications-body">
        {loading ? (
          <div className="notifications-empty">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <BellOff size={16} /> No notifications
          </div>
        ) : (
          <ul className="notifications-list">
            {notifications.map((n) => (
              <li
                key={n._id}
                className={`notification-item ${n.isRead ? "read" : "unread"}`}
                onClick={() => onItemClick(n)}
              >
                <div className="notification-main">
                  <div className="notification-message">{n.message}</div>
                  <div className="notification-meta">
                    <span className={`badge ${n.type}`}>{n.type}</span>
                    <span className="time">
                      {new Date(n.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                {!n.isRead && <span className="dot" />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
