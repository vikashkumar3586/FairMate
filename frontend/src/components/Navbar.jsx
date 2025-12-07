import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, Settings, LogOut, User, Download, Menu, X } from "lucide-react";
import { toast } from "react-toastify";
import { getAvatarUrl, getAvatarFallbackInitial } from "../utils/avatar";
import "./Navbar.css";
import NotificationsPanel from "./NotificationsPanel";

const API_BASE = import.meta.env.VITE_BACKEND_URL;

const Navbar = ({ onLogout }) => {
  const location = useLocation();
  const [userData, setUserData] = useState({
    name: "User",
    email: "user@example.com",
    avatarUrl: "",
  });
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileUserOpen, setMobileUserOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notifyRef = useRef(null);

  const navigationItems = [
    { path: "/", label: "Dashboard" },
    { path: "/expenses", label: "My Expenses" },
    { path: "/group", label: "Group" },
    { path: "/budget", label: "Budget" },
  ];

  useEffect(() => {
    fetchUserData();
    fetchNotificationCount();

    const handleUserUpdate = () => {
      fetchUserData();
    };

    window.addEventListener("userUpdated", handleUserUpdate);

    return () => {
      window.removeEventListener("userUpdated", handleUserUpdate);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Close notifications on outside click or ESC
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showNotifications && notifyRef.current && !notifyRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showNotifications]);

  // Close mobile menu on route change or wide screens
  useEffect(() => {
    setMobileOpen(false);
    setMobileUserOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900 && mobileOpen) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [mobileOpen]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.user || data; // backend returns { success, user: { name, email, ... } }
        setUserData({
          name: user?.name || localStorage.getItem("userName") || "User",
          email: user?.email || localStorage.getItem("userEmail") || "user@example.com",
          avatarUrl: user?.avatarUrl || "",
        });
      } else {
        const storedName = localStorage.getItem("userName");
        const storedEmail = localStorage.getItem("userEmail");
        setUserData({
          name: storedName || "User",
          email: storedEmail || "user@example.com",
          avatarUrl: "",
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      const storedName = localStorage.getItem("userName");
      const storedEmail = localStorage.getItem("userEmail");
      setUserData({
        name: storedName || "User",
        email: storedEmail || "user@example.com",
        avatarUrl: "",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `${API_BASE}/api/notifications/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotificationCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching notification count:", error);
      setNotificationCount(0);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to export data");
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/expenses/export-csv`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Data exported successfully!");
      } else {
        toast.error("Failed to export data");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    }
  };

  const handleNotifications = () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) {
      fetchNotifications();
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(
        `${API_BASE}/api/notifications/${notificationId}/read`,
        { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n)));
        // decrement count locally
        setNotificationCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    await Promise.all(unread.map((n) => markNotificationRead(n._id)));
    fetchNotificationCount();
  };

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    const isConfirmed = window.confirm("Are you sure you want to log out?");
    if (isConfirmed) {
      toast.success("Logged out successfully!");
      if (onLogout) {
        onLogout();
      }
    }
  };

  return (
    <header className={`navbar ${mobileOpen ? 'open' : ''}`}>
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="logo-box">F</div>
          <span className="logo-text">FairMate</span>
        </Link>

        {/* Hamburger Toggle (mobile) */}
        <button className="menu-toggle" aria-label="Toggle menu" onClick={() => setMobileOpen(o => !o)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Mobile topbar actions: bell + avatar */}
        <div className="nav-actions-mobile">
          <button className="btn-ghost btn-notify" onClick={handleNotifications}>
            <Bell size={20} />
            {notificationCount > 0 && (
              <span className="notify-badge">{notificationCount}</span>
            )}
          </button>
          <div className={`user-menu ${mobileUserOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="mobile-user-toggle"
              onClick={() => setMobileUserOpen(v => !v)}
              aria-expanded={mobileUserOpen}
            >
              <div className="avatar">
                {loading ? (
                  <div className="avatar-loading">...</div>
                ) : getAvatarUrl(userData) ? (
                  <img src={getAvatarUrl(userData)} alt="User" />
                ) : (
                  <div className="avatar-fallback">
                    {getAvatarFallbackInitial(userData)}
                  </div>
                )}
              </div>
            </button>
            <div className="dropdown-content">
              <div className="dropdown-header">
                <p className="user-name">{loading ? 'Loading...' : userData.name}</p>
                <p className="user-email">{loading ? 'loading@example.com' : userData.email}</p>
              </div>
              <div className="dropdown-separator" />
              <Link to="/profile" className="dropdown-item" onClick={() => setMobileUserOpen(false)}>
                <User size={16} /> Profile
              </Link>
              <div className="dropdown-item">
                <Settings size={16} /> Settings
              </div>
              <div className="dropdown-separator" />
              <div className="dropdown-item logout-item" onClick={handleLogout}>
                <LogOut size={16} /> Log out
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links (desktop) */}
        <nav className="nav-links">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive(item.path) ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div className="nav-actions">
          

          <div className="notify-wrapper" ref={notifyRef}>
            <button className="btn-ghost btn-notify" onClick={handleNotifications} aria-haspopup="dialog" aria-expanded={showNotifications}>
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="notify-badge">{notificationCount}</span>
              )}
            </button>
            {showNotifications && (
              <NotificationsPanel
                notifications={notifications}
                loading={loadingNotifications}
                onMarkAllRead={markAllNotificationsRead}
                onRefresh={() => { fetchNotifications(); fetchNotificationCount(); }}
                onItemClick={(n) => {
                  if (!n.isRead) markNotificationRead(n._id);
                }}
              />
            )}
          </div>

          <div className="user-menu">
            <div className="avatar">
              {loading ? (
                <div className="avatar-loading">...</div>
              ) : getAvatarUrl(userData) ? (
                <img src={getAvatarUrl(userData)} alt="User" />
              ) : (
                <div className="avatar-fallback">
                  {getAvatarFallbackInitial(userData)}
                </div>
              )}
            </div>
            <div className="dropdown-content">
              <div className="dropdown-header">
                <p className="user-name">{loading ? "Loading..." : userData.name}</p>
                <p className="user-email">
                  {loading ? "loading@example.com" : userData.email}
                </p>
              </div>
              <div className="dropdown-separator" />
              <Link to="/profile" className="dropdown-item">
                <User size={16} /> Profile
              </Link>
              <div className="dropdown-item">
                <Settings size={16} /> Settings
              </div>
              <div className="dropdown-separator" />
              <div className="dropdown-item logout-item" onClick={handleLogout}>
                <LogOut size={16} /> Log out
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile slide-down panel */}
      <div className="mobile-panel">
        <nav className="mobile-links">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-link ${isActive(item.path) ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
       
        <div className="mobile-toolbar">
          
          <div className={`user-menu mobile-user ${mobileUserOpen ? 'open' : ''}`}>
            
            <div className="dropdown-content">
              <div className="dropdown-header">
                <p className="user-name">{loading ? 'Loading...' : userData.name}</p>
                <p className="user-email">{loading ? 'loading@example.com' : userData.email}</p>
              </div>
              <div className="dropdown-separator" />
              <Link to="/profile" className="dropdown-item" onClick={() => setMobileUserOpen(false)}>
                <User size={16} /> Profile
              </Link>
              <div className="dropdown-item">
                <Settings size={16} /> Settings
              </div>
              <div className="dropdown-separator" />
              <div className="dropdown-item logout-item" onClick={handleLogout}>
                <LogOut size={16} /> Log out
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
