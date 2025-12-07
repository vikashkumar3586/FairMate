import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  getBudgetVsActual,
  getBudgetAlerts,
  getMonthlySummary
} from "../controllers/budgetController.js";

const router = express.Router();

router.post("/", requireAuth, createBudget);
router.get("/", requireAuth, getBudgets);

// Specific routes must come before parameterized routes
router.get("/vs-actual", requireAuth, getBudgetVsActual);
router.get("/alerts", requireAuth, getBudgetAlerts);
router.get("/monthly-summary", requireAuth, getMonthlySummary);

// Parameterized routes come last
router.get("/:id", requireAuth, getBudgetById);
router.put("/:id", requireAuth, updateBudget);
router.delete("/:id", requireAuth, deleteBudget);

export default router; 