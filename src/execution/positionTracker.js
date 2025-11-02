// src/execution/positionTracker.js
import { logger } from "../utils/logger.js";
import { getISTDateKey } from "../utils/istTime.js";

export function createPositionTracker() {
  // list of currently open trades
  const openPositions = [];
  // archive of closed trades
  const closedTrades = [];

  function addOpenPosition(pos) {
    // pos example:
    // { symbol, side:"BUY"|"SELL", qty, avgPrice, stopLoss, target, openedAt:Date }
    openPositions.push({
      ...pos,
      openedAt: pos.openedAt || new Date(),
    });
    logger.info(
      { symbol: pos.symbol, qty: pos.qty, side: pos.side },
      "[positionTracker] opened position"
    );
  }

  function updateOpenPosition(symbol, patch) {
    const idx = openPositions.findIndex((p) => p.symbol === symbol);
    if (idx === -1) return;
    openPositions[idx] = { ...openPositions[idx], ...patch };
  }

  /**
   * closePosition
   * removes position from openPositions, records it into closedTrades,
   * returns { pnlRs, ... }
   */
  function closePosition({ symbol, exitPrice, reason = "" }) {
    const idx = openPositions.findIndex((p) => p.symbol === symbol);
    if (idx === -1) return null;

    const pos = openPositions[idx];
    openPositions.splice(idx, 1);

    // PnL calc (BUY means profit if exitPrice > avgPrice)
    let pnlRs = 0;
    if (pos.side === "BUY") {
      pnlRs = (exitPrice - pos.avgPrice) * pos.qty;
    } else if (pos.side === "SELL") {
      pnlRs = (pos.avgPrice - exitPrice) * pos.qty;
    }

    const record = {
      ...pos,
      exitPrice,
      closedAt: new Date(),
      dayKey: getISTDateKey(),
      pnlRs,
      reason,
    };

    closedTrades.push(record);

    logger.info(
      {
        symbol: pos.symbol,
        qty: pos.qty,
        side: pos.side,
        exitPrice,
        pnlRs,
      },
      "[positionTracker] closed position"
    );

    return record;
  }

  function getOpenPositions() {
    return openPositions.slice();
  }

  function getClosedTrades() {
    return closedTrades.slice();
  }

  function getOpenCount() {
    return openPositions.length;
  }

  return {
    addOpenPosition,
    updateOpenPosition,
    closePosition,
    getOpenPositions,
    getClosedTrades,
    getOpenCount,
  };
}
