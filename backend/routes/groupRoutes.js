import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  joinGroup,
  joinGroupByCode,
  leaveGroup,
  addMember,
  removeMember,
  getSettlements,
  getAllSettlements,
  getGroupDebts,
  getGroupExpenses,
  createSettlement,
  completeSettlement
} from "../controllers/groupController.js";

const router = express.Router();

router.post("/", requireAuth, createGroup);
router.get("/", requireAuth, getGroups);
router.get("/:id", requireAuth, getGroupById);
router.put("/:id", requireAuth, updateGroup);
router.delete("/:id", requireAuth, deleteGroup);
router.post("/:id/join", requireAuth, joinGroup);
router.post("/join/:groupCode", requireAuth, joinGroupByCode); // New route for joining by code
router.post("/:id/leave", requireAuth, leaveGroup);
router.post("/:id/add-member", requireAuth, addMember);
router.post("/:id/remove-member", requireAuth, removeMember);

// Group expenses
router.get("/:groupId/expenses", requireAuth, getGroupExpenses);

// Group settlements
router.get("/:groupId/settlements", requireAuth, getSettlements);
router.post("/:groupId/settlements", requireAuth, createSettlement);
router.patch("/settlements/:settlementId/complete", requireAuth, completeSettlement);

// Add global settlements endpoint
router.get("/settlements", requireAuth, getAllSettlements);

// Add group debts endpoint
router.get("/:groupId/debts", requireAuth, getGroupDebts);

export default router; 