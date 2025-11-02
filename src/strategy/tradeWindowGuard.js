// src/strategy/tradeWindowGuard.js
// Enforce time windows like "don't open fresh trades after 15:00 IST"
import { timeConfig } from "../config/timeConfig.js";
import { getISTClock } from "../utils/istTime.js";

export function tradeWindowGuard() {
  const nowHHMM = getISTClock();
  // allow only if current time <= ENTRY_CUTOFF_IST
  if (nowHHMM > timeConfig.ENTRY_CUTOFF_IST) {
    return { ok: false, reason: "entry_window_closed" };
  }
  return { ok: true };
}
