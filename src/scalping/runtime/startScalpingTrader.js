// src/scalping/runtime/startScalpingTrader.js
import { connectDb } from "../../data/db.js";
import { ensureKiteSession, validateKiteSession } from "../../data/kiteSession.js";
import { startTickStream } from "../../data/kiteStream.js";
import { logger } from "../../utils/logger.js";
import { SCALPING_CONFIG } from "../config/scalpingConfig.js";
import { createScalpingCandleHub } from "../data/candleHub.js";
import { attachScalpingPipeline } from "./attachScalpingPipeline.js";
import { createScalpingSignalExecutor } from "../execution/scalpingSignalExecutor.js";
import { loadTodayUniverse } from "../../universe/loadTodayUniverse.js";
import { validateUniverse } from "../../universe/validateUniverse.js";
import { createPnlTracker } from "../../journal/pnlTracker.js";
import { createPositionTracker } from "../../execution/positionTracker.js";
import { createExitManager } from "../../execution/exitManager.js";
import { startApiServer } from "../../api/server.js";
import { setRuntimeState } from "../../bootstrap/state.js";

/**
 * Bootstraps a full scalping algo: pulls universe from DB, builds candle hub,
 * runs ScalpEngine, gates signals through risk, and executes orders directly.
 */
export async function startScalpingTrader(customConfig = {}) {
  const config = {
    ...SCALPING_CONFIG,
    ...customConfig,
    enabled: true,
    mode: "SCALPING",
  };

  await connectDb();
  await ensureKiteSession({ forceRefresh: true });
  const validation = await validateKiteSession({ forceReload: true });
  if (!validation.ok) {
    throw new Error(`[scalping] unable to validate Kite session: ${validation.reason}`);
  }

  const dbUniverse = validateUniverse(await loadTodayUniverse());
  const activeUniverse = dbUniverse.length ? dbUniverse : validateUniverse(config.universe);

  logger.info(
    { universe: activeUniverse },
    "[scalping] starting scalping trader with DB-driven universe"
  );

  const candleHub = createScalpingCandleHub({
    universe: activeUniverse,
    maxCandles: config.maxCandles,
  });

  const pnlTracker = createPnlTracker();
  const positionTracker = createPositionTracker({ pnlTracker });
  const exitManager = createExitManager({ positionTracker });

  const signalExecutor = createScalpingSignalExecutor({
    positionTracker,
    pnlTracker,
    config,
  });

  attachScalpingPipeline({
    candleHub,
    config: { ...config, universe: activeUniverse },
    onSignal: signalExecutor.handle,
  });

  await startTickStream({
    universe: activeUniverse,
    candleStore: candleHub.raw,
    positionTracker,
    pnlTracker,
  });

  setRuntimeState({
    universe: activeUniverse,
    candleStore: candleHub.raw,
    positionTracker,
    pnlTracker,
    exitManager,
  });

  startApiServer();

  logger.info("[scalping] scalping trader online and executing automatically");
  return { candleHub, config, positionTracker, pnlTracker };
}
