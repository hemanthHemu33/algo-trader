// src/execution/orderExecutor.js
// Responsible for actually sending/placing orders.
// Right now we stay in DRY RUN mode (no broker call).
import { logger } from "../utils/logger.js";

export const orderExecutor = {
  /**
   * placeEntryOrder(orderPlan)
   * orderPlan = {
   *   symbol,
   *   side: "BUY",
   *   qty,
   *   entry,
   *   stopLoss,
   *   target,
   *   meta: { reason, confidence, rr }
   * }
   */
  async placeEntryOrder(orderPlan) {
    // We only log for now. No live order is sent.
    logger.info(
      { orderPlan },
      "[orderExecutor] (DRY RUN) would place entry order"
    );

    // Later:
    // 1. Call Zerodha REST with access_token
    // 2. After confirm, positionTracker.addOpenPosition(...)
    // 3. Schedule protective SL/target orders
  },
};
