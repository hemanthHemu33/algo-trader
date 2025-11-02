// src/risk/positionSizer.js
import { riskConfig } from "../config/riskConfig.js";

/**
 * Return quantity based on how many rupees we're okay to risk.
 * riskPerShare = (entry - stopLoss) for BUY.
 */
export function positionSizer(riskPerShare) {
  if (!riskPerShare || riskPerShare <= 0) return 0;
  const qty = Math.floor(riskConfig.MAX_RISK_PER_TRADE_RS / riskPerShare);
  return qty;
}
