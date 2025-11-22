// src/execution/protectiveOrders.js
import {
  cancelRegularOrder,
  placeMISTargetSell,
  placeMISStopLossSell,
  placeMISStopLossBuy,
  placeMISTargetBuy,
} from "../data/kiteREST.js";
import { logger } from "../utils/logger.js";
import { pollOrderUntilTerminal } from "./orderPolling.js";

export async function placeProtectiveBracket({
  symbol,
  qty,
  stopLoss,
  target,
  side = "LONG",
}) {
  const isShort = side === "SHORT";
  const [stopLossOrder, targetOrder] = await Promise.all([
    isShort
      ? placeMISStopLossBuy({ symbol, qty, triggerPrice: stopLoss })
      : placeMISStopLossSell({ symbol, qty, triggerPrice: stopLoss }),
    isShort
      ? placeMISTargetBuy({ symbol, qty, price: target })
      : placeMISTargetSell({ symbol, qty, price: target }),
  ]);

  return {
    stopLossOrderId: stopLossOrder.orderId,
    targetOrderId: targetOrder.orderId,
  };
}

export async function cancelProtectiveOrders(orders = {}) {
  const ids = [orders.stopLossOrderId, orders.targetOrderId].filter(Boolean);
  for (const id of ids) {
    try {
      await cancelRegularOrder(id);
    } catch (err) {
      logger.warn({ orderId: id, err: err.message }, "[protective] cancel failed");
    }
  }
}

export async function monitorProtectiveOrders({
  symbol,
  protectiveOrders,
  positionTracker,
}) {
  if (!protectiveOrders?.stopLossOrderId || !protectiveOrders?.targetOrderId) {
    return;
  }

  const stopPromise = pollOrderUntilTerminal({
    orderId: protectiveOrders.stopLossOrderId,
    label: `stopLoss:${symbol}`,
  }).then((res) => ({ ...res, which: "stop" }));

  const targetPromise = pollOrderUntilTerminal({
    orderId: protectiveOrders.targetOrderId,
    label: `target:${symbol}`,
  }).then((res) => ({ ...res, which: "target" }));

  const first = await Promise.race([stopPromise, targetPromise]);
  const pos = positionTracker.getPosition(symbol);
  if (!pos) return; // manually closed meanwhile

  async function handleFill(result) {
    const exitPrice = result.avgPrice ?? pos.entry;
    const reason = result.which === "stop" ? "stoploss_order_hit" : "target_order_hit";
    await cancelProtectiveOrders(protectiveOrders);
    positionTracker.markClosed(symbol, exitPrice, reason, {
      exitOrderId: result.latest?.order_id,
      exitQty: result.filledQty,
    });
    logger.info({ symbol, reason, exitPrice }, "[protective] position closed by OCO");
  }

  if (first?.latest?.status === "COMPLETE" && first.filledQty > 0) {
    await handleFill(first);
    return;
  }

  const second = await (first.which === "stop" ? targetPromise : stopPromise);
  if (second?.latest?.status === "COMPLETE" && second.filledQty > 0) {
    await handleFill(second);
  } else {
    logger.warn(
      { symbol },
      "[protective] both protective orders ended without a fill"
    );
  }
}
