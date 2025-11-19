// src/config/tradingRules.js
import { ENV } from "./env.js";

export const tradingRules = {
  defaultLotSize: ENV.DEFAULT_LOT_SIZE,
  defaultMaxOrderQty: ENV.DEFAULT_MAX_ORDER_QTY,
  exchanges: {
    NSE: {
      lotSize: ENV.NSE_EQUITY_LOT_SIZE,
      maxOrderQty: ENV.NSE_EQUITY_MAX_ORDER_QTY,
    },
  },
};

export function resolveTradeConstraints(symbol) {
  const [exchange] = (symbol || "").split(":");
  const exchangeRules = tradingRules.exchanges[exchange] || {};

  const lotSize = exchangeRules.lotSize || tradingRules.defaultLotSize;
  const maxOrderQty =
    exchangeRules.maxOrderQty || tradingRules.defaultMaxOrderQty;

  return { lotSize, maxOrderQty };
}
