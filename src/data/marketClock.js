// src/data/marketClock.js
import { timeConfig } from "../config/timeConfig.js";
import { getISTClock } from "../utils/istTime.js";
import { enforceKillSwitch } from "../execution/killSwitch.js";
import { logger } from "../utils/logger.js";

/**
 * Repeatedly:
 * - enforce kill switch (daily loss cap)
 * - square off after FORCE_EXIT_IST
 */
export function startMarketClock({ exitManager, pnlTracker }) {
  setInterval(() => {
    const nowHHMM = getISTClock();

    // 1) daily kill switch
    enforceKillSwitch(pnlTracker, exitManager);

    // 2) force exit time (e.g. 15:20 IST)
    if (nowHHMM >= timeConfig.FORCE_EXIT_IST) {
      logger.info(
        { now: nowHHMM, cutoff: timeConfig.FORCE_EXIT_IST },
        "[marketClock] FORCE_EXIT_IST reached, flattening"
      );
      exitManager.closeAllPositions("FORCE_EXIT_TIME");
    }
  }, 5000);
}
