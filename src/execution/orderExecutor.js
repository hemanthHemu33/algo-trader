// src/execution/orderExecutor.js
import { riskConfig } from "../config/riskConfig.js";
import { placeMISBuy, placeMISSell } from "../data/kiteREST.js";
import { logger } from "../utils/logger.js";
import { pollOrderUntilTerminal } from "./orderPolling.js";
import {
  cancelProtectiveOrders,
  placeProtectiveBracket,
} from "./protectiveOrders.js";
import { getSpendableMargin } from "../data/marginService.js";
import { estimateEntryRequirement } from "../risk/tradeCosting.js";

/**
 * placeLongTrade()
 * - send MIS market BUY
 * - returns brokerOrderId + what we think is entry
 */
export async function placeLongTrade({
  symbol,
  qty,
  entry,
  stopLoss,
  target,
}) {
  const margin = await getSpendableMargin();
  if (!margin.ok) {
    logger.error(
      { symbol, reason: margin.reason },
      "[orderExecutor] margin unavailable before entry"
    );
    return { status: "FAILED", brokerOrderId: null, reason: margin.reason };
  }

  const spendableCash = margin.available * riskConfig.CASH_UTILISATION_PCT;
  const requirement = estimateEntryRequirement({ qty, entry });

  if (requirement.total > spendableCash) {
    logger.error(
      {
        symbol,
        qty,
        entry,
        required: requirement.total,
        spendable: spendableCash,
      },
      "[orderExecutor] insufficient margin before sending entry"
    );
    return { status: "FAILED", brokerOrderId: null, reason: "insufficient_margin" };
  }

  const { orderId } = await placeMISBuy({ symbol, qty });

  logger.info(
    { symbol, qty, orderId, entry, stopLoss, target },
    "[orderExecutor] LONG entry sent"
  );

  const fill = await pollOrderUntilTerminal({
    orderId,
    label: `entry:${symbol}`,
  });

  if (fill.latest?.status !== "COMPLETE") {
    logger.error(
      { symbol, orderId, status: fill.latest?.status },
      "[orderExecutor] entry order failed"
    );

    if (fill.filledQty > 0) {
      await flattenResidualExposure({
        symbol,
        qty: fill.filledQty,
        reason: "partial_entry_reversal",
      });
    }

    return { status: "FAILED", brokerOrderId: orderId };
  }

  if (fill.filledQty !== qty) {
    logger.error(
      { symbol, expected: qty, filled: fill.filledQty },
      "[orderExecutor] partial fill detected, flattening"
    );
    await flattenResidualExposure({
      symbol,
      qty: fill.filledQty,
      reason: "partial_entry_reversal",
    });
    return { status: "FAILED", brokerOrderId: orderId };
  }

  const protectiveOrders = await placeProtectiveBracket({
    symbol,
    qty,
    stopLoss,
    target,
  });

  const avgPrice = fill.avgPrice ?? entry;

  return {
    status: "FILLED",
    brokerOrderId: orderId,
    avgPrice,
    filledQty: fill.filledQty,
    protectiveOrders,
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
export async function closePositionWithMarket({
  symbol,
  qty,
  reason,
  positionTracker,
}) {
  const { orderId } = await exitPositionMarket({ symbol, qty, reason });
  const fill = await pollOrderUntilTerminal({ orderId, label: `exit:${symbol}` });
  const pos = positionTracker.getPosition(symbol);
  if (pos) {
    if (fill.latest?.status !== "COMPLETE" || !fill.filledQty) {
      logger.error(
        { symbol, orderId, status: fill.latest?.status },
        "[orderExecutor] exit order did not complete"
      );
      return { orderId, fill };
    }

    await cancelProtectiveOrders(pos.protectiveOrders);
    positionTracker.markClosed(symbol, fill.avgPrice ?? pos.entry, reason, {
      exitOrderId: orderId,
      exitQty: fill.filledQty,
    });
  }

  return { orderId, fill };
}

export async function flattenAllPositions(positionTracker, reason = "force_exit") {
  const open = positionTracker.getOpenPositions();
  for (const pos of open) {
    await closePositionWithMarket({
      symbol: pos.symbol,
      qty: pos.qty,
      reason,
      positionTracker,
    });
  }
}

async function flattenResidualExposure({ symbol, qty, reason }) {
  if (!qty) return;
  const { orderId } = await exitPositionMarket({ symbol, qty, reason });
  await pollOrderUntilTerminal({ orderId, label: `flatten:${symbol}` });
  logger.warn({ symbol, qty }, "[orderExecutor] residual exposure flattened");
}
