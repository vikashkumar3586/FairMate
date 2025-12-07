import React, { useState, useEffect } from 'react';
import { FaTimes, FaUpload, FaEye, FaTrash } from 'react-icons/fa';
import './AddExpenseModal.css';
const API_BASE = import.meta.env.VITE_BACKEND_URL;
const AddExpenseModal = ({ isOpen, onClose, onExpenseAdded, groups }) => {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Food',
    date: new Date().toISOString().slice(0, 10),
    groupId: '',
    splitBetween: []
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        amount: '',
        category: 'Food',
        date: new Date().toISOString().slice(0, 10),
        groupId: '',
        splitBetween: []
      });
      setSelectedFile(null);
      setUploadedFile(null);
      setError('');
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset group and splitBetween if groupId is cleared
    if (name === 'groupId' && value === '') {
      setFormData(prev => ({ ...prev, splitBetween: [] }));
    }
  };

  const handleSplitBetweenChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    setFormData(prev => ({ ...prev, splitBetween: selected }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image (JPEG, PNG, GIF) or PDF file.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB.');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return null;
    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();
      formDataUpload.append('receipt', selectedFile);
      const response = await fetch(`${API_BASE}/api/upload/receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });
      if (response.ok) {
        const data = await response.json();
        return data.filePath;
      } else {
        throw new Error('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload receipt. Please try again.');
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let receiptURL = null;
      if (selectedFile) {
        receiptURL = await uploadFile();
        if (!receiptURL) {
          setLoading(false);
          return;
        }
      }
      const token = localStorage.getItem('token');
      // Prepare unified expense data
      const expenseData = {
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        groupId: formData.groupId || null,
        splitBetween: formData.groupId ? formData.splitBetween : [],
        receiptURL: receiptURL,
        createdAt: formData.date
      };
      const response = await fetch(`${API_BASE}/api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(expenseData)
      });
      if (response.ok) {
        onExpenseAdded();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create expense.');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      setError('Failed to create expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Add New Expense</h3>
          <button onClick={onClose} className="close-btn">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter expense title"
                required
              />
            </div>
            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Shopping">Shopping</option>
                <option value="Bills">Bills</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Education">Education</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Group (optional)</label>
              <select
                name="groupId"
                value={formData.groupId}
                    onChange={handleInputChange}
              >
                <option value="">Personal Expense</option>
                {groups.map(group => (
                  <option key={group._id} value={group._id}>
                    {group.groupName || group.name}
                  </option>
                ))}
              </select>
            </div>
            {formData.groupId && (
              <div className="form-group">
                <label>Split Between (hold Ctrl to select multiple)</label>
                <select
                  multiple
                  name="splitBetween"
                  value={formData.splitBetween}
                  onChange={handleSplitBetweenChange}
                >
                  {groups.find(g => g._id === formData.groupId)?.members.map(member => (
                    <option key={member.user._id || member.user} value={member.user._id || member.user}>
                      {member.user.name || member.user.email || member.user}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Split Preview */}
          {formData.groupId && formData.splitBetween.length > 0 && formData.amount && (
            <div className="split-preview">
              <h4>Split Preview</h4>
              <div className="split-info">
                <p><strong>Total Amount:</strong> ₹{parseFloat(formData.amount).toFixed(2)}</p>
                <p><strong>Split Between:</strong> {formData.splitBetween.length} members</p>
                <p><strong>Amount per person:</strong> ₹{(parseFloat(formData.amount) / formData.splitBetween.length).toFixed(2)}</p>
              </div>
              <div className="split-members">
                {formData.splitBetween.map(memberId => {
                  const member = groups.find(g => g._id === formData.groupId)?.members.find(m => 
                    (m.user._id || m.user) === memberId
                  );
                  return (
                    <div key={memberId} className="split-member">
                      <span>{member?.user.name || member?.user.email || member?.user}</span>
                      <span>₹{(parseFloat(formData.amount) / formData.splitBetween.length).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* File Upload Section */}
          <div className="form-group">
            <label>Receipt (Optional)</label>
            <div className="file-upload-section">
              {!selectedFile ? (
                <div className="file-upload-area">
                  <input
                    type="file"
                    id="receipt-upload"
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="receipt-upload" className="file-upload-label">
                    <FaUpload />
                    <span>Click to upload receipt</span>
                    <small>Supports: JPG, PNG, GIF, PDF (Max 5MB)</small>
                  </label>
                </div>
              ) : (
                <div className="file-preview">
                  <div className="file-info">
                    <span className="file-name">{selectedFile.name}</span>
                    <span className="file-size">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="file-actions">
                    <button
                      type="button"
                      className="action-btn view-btn"
                      onClick={() => {
                        if (uploadedFile) {
                          window.open(`${API_BASE}${uploadedFile}`, '_blank');
                        }
                      }}
                      title="View File"
                    >
                      <FaEye />
                    </button>
                    <button
                      type="button"
                      className="action-btn delete-btn"
                      onClick={() => {
                        setSelectedFile(null);
                        setUploadedFile(null);
                        setError('');
                      }}
                      title="Remove File"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseModal;
