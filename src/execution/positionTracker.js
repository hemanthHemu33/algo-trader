// src/execution/positionTracker.js
import { logger } from "../utils/logger.js";
import { getISTDateKey } from "../utils/istTime.js";

export function createPositionTracker() {
  // We'll keep an array of currently open positions
  // and an array of closed trades for the day.

  // Shape for open position example:
  // {
  //   symbol: "NSE:RELIANCE",
  //   side: "LONG",
  //   qty: 125,
  //   entryPrice: 3222.0,
  //   stopLoss: 3208.5,
  //   target: 3255.0,
  //   status: "OPEN" | "PENDING_ENTRY"
  //   openedAt: Date,
  // }

  let openPositions = [];

  // Shape for closed trade example:
  // {
  //   symbol: "NSE:RELIANCE",
  //   side: "LONG",
  //   qty: 125,
  //   entryPrice: 3222.0,
  //   exitPrice: 3250.0,
  //   realizedPnL: 3500,
  //   rrAchieved: 0.9,
  //   closedAt: Date,
  //   reason: "TARGET_HIT" | "STOP_HIT" | "EOD_EXIT"
  // }

  let closedTrades = [];
  let currentDayKey = getISTDateKey();

  function ensureDay() {
    const todayKey = getISTDateKey();
    if (todayKey !== currentDayKey) {
      logger.info(
        { prevDay: currentDayKey, newDay: todayKey },
        "[positionTracker] day rollover -> clearing state"
      );
      currentDayKey = todayKey;
      openPositions = [];
      closedTrades = [];
    }
  }

  // --- OPEN POSITION MANAGEMENT ---

  function addOpenPosition(pos) {
    ensureDay();
    openPositions.push(pos);
    logger.info({ pos }, "[positionTracker] added open position");
  }

  function updateOpenPosition(symbol, updaterFn) {
    ensureDay();
    openPositions = openPositions.map((p) => {
      if (p.symbol === symbol) {
        const updated = updaterFn(p);
        return { ...p, ...updated };
      }
      return p;
    });
  }

  function closePosition(
    symbol,
    { exitPrice, realizedPnL, rrAchieved, reason }
  ) {
    ensureDay();

    // find the position
    const idx = openPositions.findIndex((p) => p.symbol === symbol);
    if (idx === -1) {
      logger.warn({ symbol }, "[positionTracker] closePosition but not found");
      return null;
    }

    const pos = openPositions[idx];
    openPositions.splice(idx, 1);

    const closed = {
      symbol: pos.symbol,
      side: pos.side,
      qty: pos.qty,
      entryPrice: pos.entryPrice,
      exitPrice,
      realizedPnL,
      rrAchieved,
      closedAt: new Date(),
      reason,
    };

    closedTrades.push(closed);

    logger.info({ closed }, "[positionTracker] position closed and recorded");

    return closed;
  }

  // --- READERS (used by API/status, risk guards, etc.) ---

  function getOpenPositions() {
    ensureDay();
    // return a copy so callers don't mutate internal state
    return [...openPositions];
  }

  function getClosedTrades() {
    ensureDay();
    return [...closedTrades];
  }

  return {
    addOpenPosition,
    updateOpenPosition,
    closePosition,
    getOpenPositions,
    getClosedTrades,
  };
}
