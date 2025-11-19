// src/api/controllers/statusController.js
import { getRuntimeState } from "../../bootstrap/state.js";
import { getISTClock, getISTDateKey } from "../../utils/istTime.js";
import { getAuthHealth } from "../../data/kiteSession.js";
import { fetchBrokerOrderStates } from "../../execution/reconcileBrokerState.js";

export function getHealth(req, res) {
  const runtime = getRuntimeState();
  if (!runtime) {
    return res.status(500).json({
      ok: false,
      error: "not_initialized",
    });
  }

  res.json({
    ok: true,
    date: getISTDateKey(),
    time: getISTClock(),
    universe: runtime.universe,
    openPositions: runtime.positionTracker.getOpenPositions(),
    closedTrades: runtime.positionTracker.getClosedTrades
      ? runtime.positionTracker.getClosedTrades()
      : [],
    realizedPnL: runtime.pnlTracker.getRealizedPnL(),
  });
}

export function getAuthHealthStatus(req, res) {
  const health = getAuthHealth();
  res.json({
    ok: !!health?.ok,
    checkedAt: health?.checkedAt,
    method: health?.method,
    reason: health?.reason,
    profile: health?.profile,
  });
}

export async function getBrokerOrders(req, res) {
  try {
    const orders = await fetchBrokerOrderStates();
    res.json({ ok: true, orders });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
