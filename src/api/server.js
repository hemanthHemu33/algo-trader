import express from "express";
import { ENV } from "../config/env.js";
import { logger } from "../utils/logger.js";

export async function startApiServer(appState) {
  const app = express();
  app.use(express.json());

  // health
  app.get("/api/status/health", (req, res) => {
    return res.json({
      ok: true,
      service: "trader-core",
      ts: Date.now(),
      universe: appState.universe,
      openPositions: appState.positionTracker.getOpenPositions(),
      realizedPnL: appState.pnlTracker.getRealizedPnL(),
    });
  });

  app.listen(ENV.PORT, () => {
    logger.info({ port: ENV.PORT }, "[api] listening");
  });
}
