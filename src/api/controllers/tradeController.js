// src/api/controllers/tradeController.js
import { getRuntimeState } from "../../bootstrap/state.js";

export function forceCloseAll(req, res) {
  const runtime = getRuntimeState();
  if (!runtime) {
    return res.status(500).json({
      ok: false,
      error: "not_initialized",
    });
  }

  runtime.exitManager.closeAllPositions("MANUAL_FORCE_CLOSE");

  res.json({
    ok: true,
    message: "All positions force-closed",
    openPositions: runtime.positionTracker.getOpenPositions(),
    realizedPnL: runtime.pnlTracker.getRealizedPnL(),
  });
}
