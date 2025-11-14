// src/risk/dailyRiskGuard.js
import { riskConfig } from "../config/riskConfig.js";

export function canTakeNewTrade({ pnlTracker, positionTracker }) {
  // daily loss cap
  if (pnlTracker.getRealizedPnL() <= -riskConfig.MAX_DAILY_LOSS_RS) {
    return { ok: false, reason: "max_daily_loss_hit" };
  }

  // concurrent trades cap
  if (
    positionTracker.getOpenPositions().length >=
    riskConfig.MAX_CONCURRENT_TRADES
  ) {
    return { ok: false, reason: "too_many_open_positions" };
  }

  return { ok: true };
}
