// src/execution/orderExecutor.js
import { placeMISBuy, placeMISSell } from "../data/kiteREST.js";
import { logger } from "../utils/logger.js";

/**
 * placeLongTrade()
 * - send MIS market BUY
 * - returns brokerOrderId + what we think is entry
 */
export async function placeLongTrade({ symbol, qty, entry, stopLoss, target }) {
  // live order
  const { orderId } = await placeMISBuy({ symbol, qty });

  logger.info(
    { symbol, qty, orderId, entry, stopLoss, target },
    "[orderExecutor] LONG entry sent"
  );

  // we don't know exact fill price yet (market order),
  // but we assume entry for now. Later you can poll /orders/:id.
  return {
    brokerOrderId: orderId,
    avgPrice: entry,
  };
}

/**
 * exitPositionMarket()
 * - sends SELL MIS MARKET for qty
 */
export async function exitPositionMarket({ symbol, qty, reason }) {
  const { orderId } = await placeMISSell({ symbol, qty });

  logger.info({ symbol, qty, orderId, reason }, "[orderExecutor] EXIT sent");

  return { orderId };
}

/**
 * flattenAllPositions()
 * - close everything at market (used at FORCE_EXIT_IST or kill switch)
 */
export async function flattenAllPositions(positionTracker) {
  const open = positionTracker.getOpenPositions();
  for (const pos of open) {
    await exitPositionMarket({
      symbol: pos.symbol,
      qty: pos.qty,
      reason: "force_exit_all",
    });
    positionTracker.markClosed(pos.symbol, pos.entry /* rough */, "force_exit");
  }
}
