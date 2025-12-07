import express from "express";
import { requireAuth } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { getProfile, updateProfile, changePassword, updateAvatar, removeAvatar, requestEmailChange, verifyEmailChange } from "../controllers/userController.js";

const router = express.Router();

router.get("/me", requireAuth, getProfile);
router.patch("/profile", requireAuth, updateProfile);
router.patch("/password", requireAuth, changePassword);
router.post("/avatar", requireAuth, upload.single("avatar"), updateAvatar);
router.delete("/avatar", requireAuth, removeAvatar);
router.post("/email-change", requireAuth, requestEmailChange);
router.post("/email-verify", requireAuth, verifyEmailChange);

export default router;
