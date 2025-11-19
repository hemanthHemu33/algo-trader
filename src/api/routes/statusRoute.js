// src/api/routes/statusRoute.js
import { Router } from "express";
import {
  getAuthHealthStatus,
  getHealth,
  getBrokerOrders,
} from "../controllers/statusController.js";

const router = Router();
router.get("/health", getHealth);
router.get("/health/auth", getAuthHealthStatus);
router.get("/auth", getAuthHealthStatus);
router.get("/broker/orders", getBrokerOrders);

export default router;
