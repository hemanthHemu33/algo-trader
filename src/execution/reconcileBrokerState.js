// src/execution/reconcileBrokerState.js
import { fetchOrders, fetchOrderTrades } from "../data/kiteREST.js";
import { summarizeOrderState } from "./orderPolling.js";

export async function fetchBrokerOrderStates() {
  const orders = await fetchOrders();

  const enriched = await Promise.all(
    (orders || []).map(async (o) => {
      const trades = await fetchOrderTrades(o.order_id).catch(() => []);
      return {
        order: o,
        trades,
        summary: summarizeOrderState({
          latest: o,
          trades,
          avgPrice: o.average_price,
          filledQty: o.filled_quantity,
        }),
      };
    })
  );

  return enriched;
}
