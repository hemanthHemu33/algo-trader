// src/risk/dailyRiskGuard.js
import { riskConfig } from "../config/riskConfig.js";

/**
 * Checks if we're already down more than MAX_DAILY_LOSS_RS.
 * Returns { ok, realized, maxLoss, remainingLossCapacity }
 */
export function dailyRiskGuard(pnlTracker) {
  const realized = pnlTracker.getRealizedPnL(); // +profit / -loss
  const maxLoss = riskConfig.MAX_DAILY_LOSS_RS;

  const ok = realized >= -1 * maxLoss;

  return {
    ok,
    realized,
    maxLoss,
    remainingLossCapacity: ok ? -maxLoss - realized : 0,
  };
}
