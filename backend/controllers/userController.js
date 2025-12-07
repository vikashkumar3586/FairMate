import User from "../models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// GET /api/user/me - returns current user (without password)
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    console.error("getProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/user/profile - update name and phone
export const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const updates = {};
    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (typeof phone === 'string') updates.phone = phone.trim();

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true, select: "-passwordHash" }
    );

    res.json({ success: true, user });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// PATCH /api/user/password - change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both current and new passwords are required" });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "New password must be at least 6 characters" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) return res.status(400).json({ message: "Current password is incorrect" });

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ message: "Failed to change password" });
  }
};

// POST /api/user/avatar - upload avatar file (field name: avatar)
export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const avatarPath = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatarUrl: avatarPath } },
      { new: true, select: "-passwordHash" }
    );

    res.json({ success: true, user });
  } catch (err) {
    console.error("updateAvatar error:", err);
    res.status(500).json({ message: "Failed to update avatar" });
  }
};

// DELETE /api/user/avatar - remove avatar
export const removeAvatar = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatarUrl: '' } },
      { new: true, select: "-passwordHash" }
    );
    res.json({ success: true, user });
  } catch (err) {
    console.error("removeAvatar error:", err);
    res.status(500).json({ message: "Failed to remove avatar" });
  }
};

// POST /api/user/email-change - initiate change (returns token in dev)
export const requestEmailChange = async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;
    if (!newEmail || !currentPassword) {
      return res.status(400).json({ message: "New email and current password are required" });
    }

    const existing = await User.findOne({ email: newEmail.toLowerCase().trim() });
    if (existing) return res.status(400).json({ message: "Email already in use" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) return res.status(400).json({ message: "Current password is incorrect" });

    const token = crypto.randomBytes(20).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.newEmailPending = newEmail.toLowerCase().trim();
    user.emailChangeToken = token;
    user.emailChangeExpires = expires;
    await user.save();

    // In production, send email with token link here.
    // For development, return token so user can verify.
    res.json({ success: true, message: "Verification email sent (dev: token returned)", token });
  } catch (err) {
    console.error("requestEmailChange error:", err);
    res.status(500).json({ message: "Failed to initiate email change" });
  }
};

// POST /api/user/email-verify - verify token and finalize email change
export const verifyEmailChange = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.emailChangeToken || user.emailChangeToken !== token) {
      return res.status(400).json({ message: "Invalid token" });
    }
    if (!user.emailChangeExpires || user.emailChangeExpires < new Date()) {
      return res.status(400).json({ message: "Token expired" });
    }
    if (!user.newEmailPending) {
      return res.status(400).json({ message: "No email change requested" });
    }

    user.email = user.newEmailPending.toLowerCase().trim();
    user.newEmailPending = '';
    user.emailChangeToken = '';
    user.emailChangeExpires = null;
    await user.save();

    const safeUser = await User.findById(user._id).select('-passwordHash');
    res.json({ success: true, message: "Email updated successfully", user: safeUser });
  } catch (err) {
    console.error("verifyEmailChange error:", err);
    res.status(500).json({ message: "Failed to verify email change" });
  }
};
