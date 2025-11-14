// src/risk/finalRiskCheck.js
import { riskConfig } from "../config/riskConfig.js";
import { canTakeNewTrade } from "./dailyRiskGuard.js";
import { computePositionSize } from "./positionSizer.js";
import { isBeforeTimeHHMM } from "../utils/istTime.js";
import { ENV } from "../config/env.js";

export async function evaluateTradeRisk({
  setup,
  pnlTracker,
  positionTracker,
}) {
  if (!setup) {
    return { ok: false, reason: "no_setup" };
  }

  // after cutoff? don't open fresh trades
  if (!isBeforeTimeHHMM(ENV.ENTRY_CUTOFF_IST)) {
    return { ok: false, reason: "after_entry_cutoff" };
  }

  // RR check
  const rr = (setup.target - setup.entry) / (setup.entry - setup.stopLoss);
  if (rr < riskConfig.MIN_RR) {
    return { ok: false, reason: "rr_below_min" };
  }

  // daily loss / concurrency check
  const guard = canTakeNewTrade({ pnlTracker, positionTracker });
  if (!guard.ok) {
    return { ok: false, reason: guard.reason };
  }

  // position sizing
  const sizeInfo = await computePositionSize({
    entry: setup.entry,
    stopLoss: setup.stopLoss,
  });

  if (!sizeInfo.qty || sizeInfo.qty <= 0) {
    return { ok: false, reason: sizeInfo.reason || "position_sizing_failed" };
  }

  return {
    ok: true,
    qty: sizeInfo.qty,
  };
}
