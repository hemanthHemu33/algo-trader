// src/risk/finalRiskCheck.js
import { riskConfig } from "../config/riskConfig.js";
import { dailyRiskGuard } from "./dailyRiskGuard.js";
import { positionSizer } from "./positionSizer.js";
import { validateRR } from "./validateRR.js";
import { tradeWindowGuard } from "../strategy/tradeWindowGuard.js";

/**
 * finalRiskCheck({ setup, positionTracker, pnlTracker })
 * Decides if we're allowed to actually trade this setup.
 * Returns either { ok:false, reason } OR { ok:true, orderPlan }
 */
export function finalRiskCheck({ setup, positionTracker, pnlTracker }) {
  if (!setup) {
    return { ok: false, reason: "no_setup" };
  }

  const { entry, stopLoss, target } = setup;
  if (
    entry == null ||
    stopLoss == null ||
    target == null ||
    !(stopLoss < entry)
  ) {
    return { ok: false, reason: "invalid_levels" };
  }

  // 1) Time window guard (don't open too late)
  const tw = tradeWindowGuard();
  if (!tw.ok) {
    return { ok: false, reason: tw.reason || "time_window_block" };
  }

  // 2) daily loss guard
  const dr = dailyRiskGuard(pnlTracker);
  if (!dr.ok) {
    return { ok: false, reason: "daily_loss_cap" };
  }

  // 3) max concurrent trades guard
  if (positionTracker.getOpenCount() >= riskConfig.MAX_CONCURRENT_TRADES) {
    return { ok: false, reason: "max_concurrent_trades" };
  }

  // 4) RR check
  const rrCheck = validateRR(entry, stopLoss, target);
  if (!rrCheck.ok) {
    return { ok: false, reason: "rr_too_low", rr: rrCheck.rr };
  }

  // 5) position sizing
  const riskPerShare = entry - stopLoss;
  const qty = positionSizer(riskPerShare);
  if (qty <= 0) {
    return { ok: false, reason: "qty_zero" };
  }

  const orderPlan = {
    symbol: setup.symbol,
    side: "BUY",
    qty,
    entry,
    stopLoss,
    target,
    meta: {
      reason: setup.reason,
      confidence: setup.confidence || 0,
      rr: rrCheck.rr,
    },
  };

  return { ok: true, orderPlan };
}
