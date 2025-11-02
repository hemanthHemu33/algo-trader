// src/api/routes/tradeRoutes.js
import { Router } from "express";
import { forceCloseAll } from "../controllers/tradeController.js";

const router = Router();
router.post("/flat-all", forceCloseAll); // manual kill button

export default router;
