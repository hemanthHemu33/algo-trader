// src/execution/killSwitch.js
import { riskConfig } from "../config/riskConfig.js";
import { logger } from "../utils/logger.js";

export function enforceKillSwitch(pnlTracker, exitManager) {
  const realized = pnlTracker.getRealizedPnL();
  if (realized <= -1 * riskConfig.MAX_DAILY_LOSS_RS) {
    logger.warn(
      {
        realized,
        maxLoss: riskConfig.MAX_DAILY_LOSS_RS,
      },
      "[killSwitch] Daily loss breached. Flattening all positions."
    );
    exitManager.closeAllPositions("DAILY_LOSS_LIMIT");
  }
}
