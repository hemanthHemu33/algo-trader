// src/risk/validateRR.js
import { riskConfig } from "../config/riskConfig.js";

/**
 * Check that Reward/Risk >= MIN_RR.
 * Returns { ok, rr }
 */
export function validateRR(entry, stopLoss, target) {
  const risk = entry - stopLoss;
  if (risk <= 0) {
    return { ok: false, rr: 0 };
  }
  const reward = target - entry;
  const rr = reward / risk;
  return {
    ok: rr >= riskConfig.MIN_RR,
    rr,
  };
}
