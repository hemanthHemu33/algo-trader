// src/journal/pnlTracker.js
import { getISTDateKey } from "../utils/istTime.js";
import { logger } from "../utils/logger.js";

export function createPnlTracker() {
  // We'll track realized P&L per trading day (IST-based)
  let currentDayKey = getISTDateKey();
  let realizedPnL = 0;

  function ensureDay() {
    const todayKey = getISTDateKey();
    if (todayKey !== currentDayKey) {
      // new day -> reset
      logger.info(
        { prevDay: currentDayKey, newDay: todayKey },
        "[pnlTracker] day rollover -> resetting P&L"
      );
      currentDayKey = todayKey;
      realizedPnL = 0;
    }
  }

  // Call this whenever we fully close a position and lock in profit/loss
  function addRealizedPnL(amountRs) {
    ensureDay();
    realizedPnL += amountRs;
    logger.info(
      { realizedPnL, delta: amountRs },
      "[pnlTracker] updated realized P&L"
    );
  }

  function getRealizedPnL() {
    ensureDay();
    return realizedPnL;
  }

  function getDayKey() {
    return currentDayKey;
  }

  return {
    addRealizedPnL,
    getRealizedPnL,
    getDayKey,
  };
}
