// src/risk/positionSizer.js
import { riskConfig } from "../config/riskConfig.js";
import { fetchAvailableEquityMargin } from "../data/kiteREST.js";

export async function computePositionSize({ entry, stopLoss }) {
  const stopDist = entry - stopLoss;
  if (stopDist <= 0) {
    return { qty: 0, reason: "invalid_stop" };
  }

  // rupees we're ready to lose on this trade
  const perTradeRiskCap = riskConfig.MAX_RISK_PER_TRADE_RS; // e.g. 500

  // shares by risk budget
  const maxQtyByRisk = Math.floor(perTradeRiskCap / stopDist);

  // also respect available cash
  const availableCash = await fetchAvailableEquityMargin(); // from getMargins('equity')
  const spendableCash = availableCash * riskConfig.CASH_UTILISATION_PCT;
  const maxQtyByCash = Math.floor(spendableCash / entry);

  const qty = Math.max(0, Math.min(maxQtyByRisk, maxQtyByCash));

  if (qty <= 0) {
    return { qty: 0, reason: "no_capital" };
  }

  return { qty };
}
