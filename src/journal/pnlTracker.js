// src/journal/pnlTracker.js
import { getISTDateKey } from "../utils/istTime.js";
import { logger } from "../utils/logger.js";

// src/journal/pnlTracker.js
export function createPnlTracker() {
  let realized = 0;
  const fills = [];

  function addRealizedPnL(delta, meta) {
    realized += delta;
    fills.push({
      ts: Date.now(),
      ...meta,
      delta,
    });
  }

  function getRealizedPnL() {
    return realized;
  }

  function getFills() {
    return fills.slice();
  }

  return {
    addRealizedPnL,
    getRealizedPnL,
    getFills,
  };
}
