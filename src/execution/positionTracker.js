// src/execution/positionTracker.js
import { riskConfig } from "../config/riskConfig.js";

export function createPositionTracker({ pnlTracker }) {
  const _positions = {}; // symbol -> { qty, entry, stopLoss, target, status, protectiveOrders }
  const _closedTrades = [];

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
    protectiveOrders,
  }) {
    _positions[symbol] = {
      qty,
      entry,
      stopLoss,
      target,
      brokerOrderId,
      protectiveOrders,
      status: "OPEN",
      openedAt: Date.now(),
    };
  }

  function markClosed(symbol, exitPrice, reason, meta = {}) {
    const pos = _positions[symbol];
    if (!pos) return;

    const exitQty = meta.exitQty ?? pos.qty;
    const pnlPerShare = exitPrice - pos.entry;
    const gross = pnlPerShare * exitQty;

    const closed = {
      symbol,
      entry: pos.entry,
      exit: exitPrice,
      qty: exitQty,
      reason,
      brokerOrderId: pos.brokerOrderId,
      protectiveOrders: pos.protectiveOrders,
      exitOrderId: meta.exitOrderId,
      openedAt: pos.openedAt,
      closedAt: Date.now(),
    };

    pnlTracker.addRealizedPnL(gross, closed);
    _closedTrades.push(closed);

    delete _positions[symbol];
  }

  function getPosition(symbol) {
    return _positions[symbol] || null;
  }

  function getClosedTrades() {
    return _closedTrades.slice();
  }

  return {
    getOpenPositions,
    canOpenNewPosition,
    openNewPosition,
    markClosed,
    getPosition,
    getClosedTrades,
  };
}
