// src/api/server.js
import express from "express";
import statusRoute from "./routes/statusRoute.js";
import tradeRoutes from "./routes/tradeRoutes.js";
import { ENV } from "../config/env.js";
import { logger } from "../utils/logger.js";

export function startApiServer() {
  const app = express();
  app.use(express.json());

  app.use("/api/status", statusRoute);
  app.use("/api/trade", tradeRoutes);
  app.use("/health", statusRoute); // backward compatibility

  app.listen(ENV.PORT, () => {
    logger.info({ port: ENV.PORT }, "[api] listening");
  });

  return app;
}
