import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LoginForm from "./components/LoginForm";
import InfoSection from "./components/InfoSection";
import SignUpForm from "./components/SignUpForm";
import Dashboard from "./components/Dashboard";
import MyExpenses from "./components/MyExpenses";
import Groups from "./components/Groups";
import Budget from "./components/Budget";
import Navbar from "./components/Navbar";
import Profile from "./components/Profile";
import "./App.css";

const App = () => {
  const [showSignUp, setShowSignUp] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
    // Check for token in localStorage on initial load
    return !!localStorage.getItem('token');
  });

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
  };

  // Protected Route component
  const ProtectedRoute = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  };

  // Auth pages
  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <InfoSection />
        {showSignUp ? (
          <SignUpForm 
            onSignup={() => { setIsAuthenticated(true); }}
            onSwitchToLogin={() => setShowSignUp(false)}
          />
        ) : (
          <LoginForm 
            onLogin={() => setIsAuthenticated(true)}
            onSwitchToSignup={() => setShowSignUp(true)}
          />
        )}
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      </div>
    );
  }

  // Main app with routing and Navbar
  return (
    <Router>
      < Navbar onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/expenses" element={
          <ProtectedRoute>
            <MyExpenses onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/group" element={
          <ProtectedRoute>
            <Groups onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/budget" element={
          <ProtectedRoute>
            <Budget onLogout={handleLogout} />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
    </Router>
  );
};

export default App;