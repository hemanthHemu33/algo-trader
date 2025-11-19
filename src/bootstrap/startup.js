// src/bootstrap/startup.js
import { connectDb } from "../data/db.js";
import { getZerodhaAuth } from "../data/brokerToken.js";
import { loadTodayUniverse } from "../universe/loadTodayUniverse.js";
import { validateUniverse } from "../universe/validateUniverse.js";
import { createCandleStore } from "../data/candleStore.js";
import { preloadSession } from "../data/preloadSession.js";
import { startTickStream } from "../data/kiteStream.js";
import { createPositionTracker } from "../execution/positionTracker.js";
import { createExitManager } from "../execution/exitManager.js";
import { createPnlTracker } from "../journal/pnlTracker.js";
import { hookPipeline } from "../pipeline/runPipeline.js";
import { startMarketClock } from "../data/marketClock.js";
import { logger } from "../utils/logger.js";
import { ensureKiteSession, validateKiteSession } from "../data/kiteSession.js";

export async function startup() {
  logger.info("[startup] beginning service initialization");

  logger.info("[startup] connecting to database");
  await connectDb();
  logger.info("[startup] database connected");

  // Ensure Zerodha auth exists
  logger.info("[startup] fetching Zerodha auth token");
  const auth = await getZerodhaAuth({ forceRefresh: true });
  if (!auth.accessToken && !auth.encToken) {
    throw new Error(
      "[startup] No Zerodha auth in DB. Login to Kite and store token first."
    );
  }

  logger.info("[startup] validating Zerodha session");
  const validation = await validateKiteSession({ forceReload: true });
  if (!validation.ok) {
    logger.error({ reason: validation.reason }, "[startup] auth validation failed");
    logger.info("[startup] attempting to refresh Zerodha session");
    await ensureKiteSession({ forceRefresh: true });
    const post = await validateKiteSession({ forceReload: true });
    if (!post.ok) {
      throw new Error(`[startup] Unable to validate Zerodha session: ${post.reason}`);
    }
  }

  // Build today's universe FIRST (so 'universe' is defined)
  logger.info("[startup] loading today's trading universe");
  const rawUniverse = await loadTodayUniverse();
  const universe = validateUniverse(rawUniverse);
  logger.info({ count: universe.length }, "[startup] universe validated");

  // Candle storage + optional historical preload
  logger.info("[startup] creating candle store and preloading session data");
  const candleStore = createCandleStore(universe);
  await preloadSession({ universe, candleStore });
  logger.info("[startup] candle store ready");

  // PnL + positions
  logger.info("[startup] initializing position and PnL tracking");
  const pnlTracker = createPnlTracker();
  const positionTracker = createPositionTracker({ pnlTracker });
  const exitManager = createExitManager({ positionTracker });
  logger.info("[startup] trackers initialized");

  // Strategy pipeline listens to candle close events
  logger.info("[startup] hooking strategy pipeline");
  hookPipeline({ candleStore, pnlTracker, positionTracker, exitManager });
  logger.info("[startup] pipeline hooked");

  // Force square-off near close
  logger.info("[startup] starting market clock for auto square-off");
  startMarketClock({ positionTracker });

  // Start Zerodha live ticks -> candles -> strategy
  logger.info("[startup] starting tick stream");
  await startTickStream({
    universe,
    candleStore,
    positionTracker,
    pnlTracker,
  });

  logger.info({ count: universe.length }, "[startup] service initialized");
  return { universe, candleStore, positionTracker, pnlTracker, exitManager };
}
