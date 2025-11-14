// src/config/riskConfig.js
import { ENV } from "./env.js";

export const riskConfig = {
  MAX_DAILY_LOSS_RS: ENV.MAX_DAILY_LOSS_RS, // e.g. 2000
  MAX_RISK_PER_TRADE_RS: ENV.MAX_RISK_PER_TRADE_RS, // e.g. 500
  MAX_CONCURRENT_TRADES: ENV.MAX_CONCURRENT_TRADES, // e.g. 1
  MIN_RR: 1.5, // you asked 1:1.5
  CASH_UTILISATION_PCT: 0.8, // don't use 100% cash
};
