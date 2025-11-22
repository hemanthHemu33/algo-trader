// src/scalping/runtime/startScalpingScanner.js
import { connectDb } from "../../data/db.js";
import { ensureKiteSession, validateKiteSession } from "../../data/kiteSession.js";
import { startTickStream } from "../../data/kiteStream.js";
import { logger } from "../../utils/logger.js";
import { SCALPING_CONFIG } from "../config/scalpingConfig.js";
import { createScalpingCandleHub } from "../data/candleHub.js";
import { attachScalpingPipeline } from "./attachScalpingPipeline.js";

const noopPositionTracker = {
  getPosition: () => null,
  getOpenPositions: () => [],
};

const noopPnlTracker = {
  getRealizedPnL: () => 0,
};

/**
 * Bootstraps a lightweight scalping scanner: connects DB + Kite, builds a candle hub,
 * wires the ScalpEngine + publisher, and starts the Zerodha tick stream.
 */
export async function startScalpingScanner(customConfig = {}) {
  const config = { ...SCALPING_CONFIG, ...customConfig, enabled: true, mode: "SCALPING" };
  logger.info(
    { universe: config.universe, transport: config.transport.endpoint },
    "[scalping] starting scalping scanner"
  );

  await connectDb();
  await ensureKiteSession({ forceRefresh: true });
  const validation = await validateKiteSession({ forceReload: true });
  if (!validation.ok) {
    throw new Error(`[scalping] unable to validate Kite session: ${validation.reason}`);
  }

  const candleHub = createScalpingCandleHub({
    universe: config.universe,
    maxCandles: config.maxCandles,
  });

  attachScalpingPipeline({ candleHub, config });

  await startTickStream({
    universe: config.universe,
    candleStore: candleHub.raw,
    positionTracker: noopPositionTracker,
    pnlTracker: noopPnlTracker,
  });

  logger.info("[scalping] scalping scanner online and streaming");
  return { candleHub, config };
}
