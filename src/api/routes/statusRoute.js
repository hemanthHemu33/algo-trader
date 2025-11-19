// src/api/routes/statusRoute.js
import { Router } from "express";
import {
  getAuthHealthStatus,
  getHealth,
} from "../controllers/statusController.js";

const router = Router();
router.get("/health", getHealth);
router.get("/health/auth", getAuthHealthStatus);
router.get("/auth", getAuthHealthStatus);

export default router;
