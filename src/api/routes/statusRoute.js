// src/api/routes/statusRoute.js
import { Router } from "express";
import { getHealth } from "../controllers/statusController.js";

const router = Router();
router.get("/health", getHealth);

export default router;
