// src/risk/positionSizer.js
import { riskConfig } from "../config/riskConfig.js";
import { getSpendableMargin } from "../data/marginService.js";
import {
  applyLotAndLimits,
  computeFixedRiskCosts,
  computeVariableRiskPerUnit,
  estimateEntryRequirement,
} from "./tradeCosting.js";

export async function computePositionSize({ symbol, entry, stopLoss }) {
  if (!Number.isFinite(entry) || !Number.isFinite(stopLoss)) {
    return { qty: 0, reason: "invalid_inputs" };
  }

  const { stopDist, variableRisk } = computeVariableRiskPerUnit({
    entry,
    stopLoss,
  });

  if (stopDist <= 0 || variableRisk <= 0) {
    return { qty: 0, reason: "invalid_stop" };
  }

  const fixedRiskCosts = computeFixedRiskCosts();
  const perTradeRiskCap = riskConfig.MAX_RISK_PER_TRADE_RS;

  if (perTradeRiskCap <= fixedRiskCosts) {
    return { qty: 0, reason: "risk_budget_below_costs" };
  }

  const maxQtyByRisk = Math.floor((perTradeRiskCap - fixedRiskCosts) / variableRisk);
  if (maxQtyByRisk <= 0) {
    return { qty: 0, reason: "risk_budget_too_low" };
  }

  const margin = await getSpendableMargin();
  if (!margin.ok) {
    return { qty: 0, reason: margin.reason, retryAt: margin.retryAt };
  }

  const spendableCash = margin.available * riskConfig.CASH_UTILISATION_PCT;
  const { perUnit: entryCostPerUnit } = estimateEntryRequirement({ qty: 1, entry });

  const availableAfterBrokerage =
    spendableCash - riskConfig.BROKERAGE_PER_ORDER_RS;

  if (availableAfterBrokerage <= 0) {
    return { qty: 0, reason: "no_capital_after_fees" };
  }

  const maxQtyByCash = Math.floor(availableAfterBrokerage / entryCostPerUnit);

  let qty = Math.min(maxQtyByRisk, maxQtyByCash);

  const constrained = applyLotAndLimits({ qty, symbol });
  qty = constrained.qty;

  if (qty <= 0) {
    const capReason =
      maxQtyByCash <= 0
        ? "insufficient_margin"
        : maxQtyByRisk <= 0
          ? "risk_too_high"
          : "lot_size_exceeds_capacity";
    return { qty: 0, reason: capReason };
  }

  return { qty };
}
