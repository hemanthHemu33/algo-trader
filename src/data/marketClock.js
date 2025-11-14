// src/data/marketClock.js
import { ENV } from "../config/env.js";
import { isAfterTimeHHMM } from "../utils/istTime.js";
import { flattenAllPositions } from "../execution/orderExecutor.js";
import { logger } from "../utils/logger.js";

export function startMarketClock({ positionTracker }) {
  const timer = setInterval(async () => {
    // hard square-off rule
    if (
      isAfterTimeHHMM(ENV.FORCE_EXIT_IST) &&
      positionTracker.getOpenPositions().length > 0
    ) {
      logger.info("[marketClock] FORCE_EXIT_IST reached. Squaring off all.");
      await flattenAllPositions(positionTracker);
    }
  }, 10_000); // check every 10s

  return timer;
}
