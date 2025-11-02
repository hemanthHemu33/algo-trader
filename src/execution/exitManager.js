// src/execution/exitManager.js
import { logger } from "../utils/logger.js";
import { getISTDateKey } from "../utils/istTime.js";

export function createExitManager({ positionTracker, pnlTracker }) {
  // Check SL/Target for each position and close if hit.
  function checkStopsAndTargets(lastPriceBySymbol) {
    const open = positionTracker.getOpenPositions();

    for (const pos of open) {
      const last = lastPriceBySymbol[pos.symbol];
      if (last == null) continue;

      // BUY-only logic for now (MIS long trades)
      if (pos.side === "BUY") {
        // Stop loss hit?
        if (last <= pos.stopLoss) {
          const rec = positionTracker.closePosition({
            symbol: pos.symbol,
            exitPrice: last,
            reason: "STOP",
          });
          if (rec) {
            pnlTracker.addRealizedPnL(rec.pnlRs);
            logger.info(
              { symbol: pos.symbol, pnlRs: rec.pnlRs },
              "[exitManager] STOP exit executed"
            );
          }
          continue;
        }

        // Target hit?
        if (last >= pos.target) {
          const rec = positionTracker.closePosition({
            symbol: pos.symbol,
            exitPrice: last,
            reason: "TARGET",
          });
          if (rec) {
            pnlTracker.addRealizedPnL(rec.pnlRs);
            logger.info(
              { symbol: pos.symbol, pnlRs: rec.pnlRs },
              "[exitManager] TARGET exit executed"
            );
          }
        }
      }
    }
  }

  // Force flat: close ALL positions regardless of P&L
  function closeAllPositions(reason) {
    const stillOpen = positionTracker.getOpenPositions().slice();
    for (const pos of stillOpen) {
      const exitPx =
        pos.lastPrice || pos.avgPrice || pos.stopLoss || pos.target;
      const rec = positionTracker.closePosition({
        symbol: pos.symbol,
        exitPrice: exitPx,
        reason,
      });
      if (rec) {
        pnlTracker.addRealizedPnL(rec.pnlRs);
        logger.info(
          {
            symbol: pos.symbol,
            pnlRs: rec.pnlRs,
            reason,
            dayKey: getISTDateKey(),
          },
          "[exitManager] FORCE FLAT exit executed"
        );
      }
    }
  }

  return {
    checkStopsAndTargets,
    closeAllPositions,
  };
}
