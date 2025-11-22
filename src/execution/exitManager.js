// src/execution/exitManager.js
import { closePositionWithMarket } from "./orderExecutor.js";
import { logger } from "../utils/logger.js";

export function createExitManager({ positionTracker }) {
  async function maybeExitPositions({ symbol, lastCandle }) {
    const pos = positionTracker.getPosition(symbol);
    if (!pos) return;
    if (pos?.protectiveOrders) return; // bracket orders already at broker

    const ltp = lastCandle.close;

    const isShort = pos.side === "SHORT";

    // target hit?
    const targetHit = isShort ? ltp <= pos.target : ltp >= pos.target;
    if (targetHit) {
      await closePositionWithMarket({
        symbol,
        qty: pos.qty,
        reason: "target_hit",
        side: pos.side,
        positionTracker,
      });

      logger.info({ symbol }, "[exitManager] target hit, booked profit");
      return;
    }

    // stoploss hit?
    const stopHit = isShort ? ltp >= pos.stopLoss : ltp <= pos.stopLoss;
    if (stopHit) {
      await closePositionWithMarket({
        symbol,
        qty: pos.qty,
        reason: "stoploss_hit",
        side: pos.side,
        positionTracker,
      });

      logger.info({ symbol }, "[exitManager] stoploss hit, exited");
    }
  }

  async function closeAllPositions(reason = "manual_close_all") {
    const open = positionTracker.getOpenPositions();
    for (const pos of open) {
      await closePositionWithMarket({
        symbol: pos.symbol,
        qty: pos.qty,
        side: pos.side,
        reason,
        positionTracker,
      });
    }
  }

  return { maybeExitPositions, closeAllPositions };
}
