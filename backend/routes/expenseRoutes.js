import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  exportCSV,
  markShareAsPaid,
  getUserDebtSummary
} from "../controllers/expenseController.js";

const router = express.Router();

router.post("/", requireAuth, createExpense);
router.get("/", requireAuth, getExpenses);
router.get("/debt-summary", requireAuth, getUserDebtSummary);
router.get("/:id", requireAuth, getExpenseById);
router.put("/:id", requireAuth, updateExpense);
router.delete("/:id", requireAuth, deleteExpense);
router.get("/export/csv", requireAuth, exportCSV);
router.patch("/:expenseId/mark-paid", requireAuth, markShareAsPaid);

export default router; 