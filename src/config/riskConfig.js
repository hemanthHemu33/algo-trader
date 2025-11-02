import { ENV } from "./env.js";

export const riskConfig = {
  MAX_DAILY_LOSS_RS: ENV.MAX_DAILY_LOSS_RS,
  MAX_RISK_PER_TRADE_RS: ENV.MAX_RISK_PER_TRADE_RS,
  MAX_CONCURRENT_TRADES: ENV.MAX_CONCURRENT_TRADES,
  MIN_RR: 2.0, // hard rule in v1
};
