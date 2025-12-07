import express from "express";
import { signup, login, getCurrentUser, verifyToken, googleAuth } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/verify", verifyToken);
router.post("/google", googleAuth);

// Protected routes
router.get("/me", requireAuth, getCurrentUser);

export default router;