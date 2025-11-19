// src/execution/orderPolling.js
import {
  fetchOrderHistory,
  fetchOrderTrades,
} from "../data/kiteREST.js";

const TERMINAL = new Set(["COMPLETE", "CANCELLED", "REJECTED"]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeAvgPrice(trades) {
  if (!Array.isArray(trades) || !trades.length) return null;
  let notional = 0;
  let qty = 0;
  for (const t of trades) {
    const q = Number(t.quantity ?? t.qty ?? 0);
    const p = Number(t.price ?? t.average_price ?? 0);
    notional += q * p;
    qty += q;
  }
  if (!qty) return null;
  return notional / qty;
}

export async function pollOrderUntilTerminal({
  orderId,
  pollIntervalMs = 1000,
  timeoutMs = 20000,
  label = "order",
} = {}) {
  const started = Date.now();

  while (true) {
    const { latest } = await fetchOrderHistory(orderId);
    const trades = await fetchOrderTrades(orderId);
    const avgPrice = computeAvgPrice(trades) ?? latest?.average_price;
    const tradeFilledQty = trades.reduce(
      (sum, t) => sum + Number(t.quantity ?? t.qty ?? 0),
      0
    );
    const filledQty = tradeFilledQty || Number(latest?.filled_quantity ?? 0);

    if (latest && TERMINAL.has(latest.status)) {
      return { latest, trades, avgPrice, filledQty };
    }

    if (Date.now() - started > timeoutMs) {
      throw new Error(
        `[orderPolling] timeout waiting for ${label} ${orderId} to settle`
      );
    }

    await sleep(pollIntervalMs);
  }
}

export function summarizeOrderState(result) {
  if (!result?.latest) return null;
  return {
    orderId: result.latest.order_id,
    status: result.latest.status,
    filledQty: result.filledQty,
    avgPrice: result.avgPrice,
    exchangeTimestamp: result.latest.exchange_timestamp,
    raw: result.latest,
  };
}
