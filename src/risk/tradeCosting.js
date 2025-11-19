// src/risk/tradeCosting.js
import { riskConfig } from "../config/riskConfig.js";
import { resolveTradeConstraints } from "../config/tradingRules.js";

export function computeVariableRiskPerUnit({ entry, stopLoss }) {
  const stopDist = entry - stopLoss;
  const slippageRisk =
    entry * riskConfig.ENTRY_SLIPPAGE_PCT +
    stopLoss * riskConfig.EXIT_SLIPPAGE_PCT;
  const chargesRisk = (entry + stopLoss) * riskConfig.ROUND_TRIP_CHARGES_PCT;
  const variableRisk = stopDist + slippageRisk + chargesRisk;

  return { stopDist, slippageRisk, chargesRisk, variableRisk };
}

export function computeFixedRiskCosts() {
  return riskConfig.BROKERAGE_PER_ORDER_RS * 2; // entry + exit
}

export function estimateEntryRequirement({ qty, entry }) {
  const entryChargesPct = riskConfig.ROUND_TRIP_CHARGES_PCT / 2;
  const perUnit =
    entry + entry * riskConfig.ENTRY_SLIPPAGE_PCT + entry * entryChargesPct;
  const total = qty * perUnit + riskConfig.BROKERAGE_PER_ORDER_RS;

  return { perUnit, total };
}

export function applyLotAndLimits({ qty, symbol }) {
  const { lotSize, maxOrderQty } = resolveTradeConstraints(symbol);
  const lotAdjusted = Math.floor(qty / lotSize) * lotSize;
  const capped = Math.min(lotAdjusted, maxOrderQty);
  return { qty: capped, lotSize, maxOrderQty };
}
