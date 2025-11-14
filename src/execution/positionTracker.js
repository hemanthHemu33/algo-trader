// src/execution/positionTracker.js
import { riskConfig } from "../config/riskConfig.js";

export function createPositionTracker({ pnlTracker }) {
  const _positions = {}; // symbol -> { qty, entry, stopLoss, target, status }

  function getOpenPositions() {
    return Object.keys(_positions).map((sym) => ({
      symbol: sym,
      ..._positions[sym],
    }));
  }

  function canOpenNewPosition() {
    return getOpenPositions().length < riskConfig.MAX_CONCURRENT_TRADES;
  }

  function openNewPosition({
    symbol,
    qty,
    entry,
    stopLoss,
    target,
    brokerOrderId,
  }) {
    _positions[symbol] = {
      qty,
      entry,
      stopLoss,
      target,
      brokerOrderId,
      status: "OPEN",
    };
  }

  function markClosed(symbol, exitPrice, reason) {
    const pos = _positions[symbol];
    if (!pos) return;

    const pnlPerShare = exitPrice - pos.entry;
    const gross = pnlPerShare * pos.qty;

    pnlTracker.addRealizedPnL(gross, {
      symbol,
      entry: pos.entry,
      exit: exitPrice,
      qty: pos.qty,
      reason,
    });

    delete _positions[symbol];
  }

  function getPosition(symbol) {
    return _positions[symbol] || null;
  }

  return {
    getOpenPositions,
    canOpenNewPosition,
    openNewPosition,
    markClosed,
    getPosition,
  };
}
