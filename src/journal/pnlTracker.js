// src/journal/pnlTracker.js
import { getISTDateKey } from "../utils/istTime.js";
import { logger } from "../utils/logger.js";

export function createPnlTracker() {
  // realized P&L for the active trading day
  let currentDayKey = getISTDateKey();
  let realizedPnL = 0; // rupees

  function ensureDay() {
    const today = getISTDateKey();
    if (today !== currentDayKey) {
      currentDayKey = today;
      realizedPnL = 0;
    }
  }

  function addRealizedPnL(deltaRs) {
    ensureDay();
    realizedPnL += deltaRs;
    logger.debug(
      { day: currentDayKey, realizedPnL },
      "[pnlTracker] updated realized PnL"
    );
  }

  function getRealizedPnL() {
    ensureDay();
    return realizedPnL;
  }

  function getDayKey() {
    ensureDay();
    return currentDayKey;
  }

  return {
    addRealizedPnL,
    getRealizedPnL,
    getDayKey,
  };
}
