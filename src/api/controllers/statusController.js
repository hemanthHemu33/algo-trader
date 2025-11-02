// src/api/controllers/statusController.js
import { getRuntimeState } from "../../bootstrap/state.js";
import { getISTClock, getISTDateKey } from "../../utils/istTime.js";

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
