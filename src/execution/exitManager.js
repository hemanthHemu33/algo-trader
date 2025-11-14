// src/execution/exitManager.js
import { exitPositionMarket } from "./orderExecutor.js";
import { logger } from "../utils/logger.js";

export async function maybeExitPositions({
  symbol,
  lastCandle,
  positionTracker,
}) {
  const pos = positionTracker.getPosition(symbol);
  if (!pos) return;

  const ltp = lastCandle.close;

  // target hit?
  if (ltp >= pos.target) {
    await exitPositionMarket({
      symbol,
      qty: pos.qty,
      reason: "target_hit",
    });
    positionTracker.markClosed(symbol, pos.target, "target_hit");

    logger.info({ symbol }, "[exitManager] target hit, booked profit");
    return;
  }

  // stoploss hit?
  if (ltp <= pos.stopLoss) {
    await exitPositionMarket({
      symbol,
      qty: pos.qty,
      reason: "stoploss_hit",
    });
    positionTracker.markClosed(symbol, pos.stopLoss, "stoploss_hit");

    logger.info({ symbol }, "[exitManager] stoploss hit, exited");
    return;
  }
}
