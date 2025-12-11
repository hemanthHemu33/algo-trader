// src/execution/ExecutionEngine.js
import { placeMISMarketOrder } from "../exec/kiteREST.js";
import { logger } from "../utils/logger.js";

export class ExecutionEngine {
  constructor({ defaultProduct = "MIS" } = {}) {
    this.defaultProduct = defaultProduct;
  }

  async place(orderRequest) {
    const payload = this.toKiteOrder(orderRequest);
    logger.info({ payload }, "[ExecutionEngine] placing order");
    try {
      const resp = await placeMISMarketOrder(payload.symbol, payload.quantity, payload.transaction_type);
      return { ok: true, orderId: resp.order_id, raw: resp };
    } catch (err) {
      logger.error({ err }, "[ExecutionEngine] order placement failed");
      return { ok: false, error: err?.message || "order_failed" };
    }
  }

  toKiteOrder(request) {
    const direction = request.direction?.toUpperCase?.();
    return {
      symbol: request.symbol,
      transaction_type: direction === "SELL" ? "SELL" : "BUY",
      quantity: request.quantity,
      product: request.product || this.defaultProduct,
      order_type: request.orderType || "MARKET",
      strategyId: request.strategyId,
      meta: request.meta,
    };
  }
}
