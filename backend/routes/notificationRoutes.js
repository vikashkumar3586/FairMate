import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getUnreadCount,
  getNotifications,
  markAsRead
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/unread-count", requireAuth, getUnreadCount);
router.get("/", requireAuth, getNotifications);
router.patch("/:notificationId/read", requireAuth, markAsRead);

export default router; 