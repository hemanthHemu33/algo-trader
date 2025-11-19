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
  await connectDb();

  // Ensure Zerodha auth exists
  const auth = await getZerodhaAuth({ forceRefresh: true });
  if (!auth.accessToken && !auth.encToken) {
    throw new Error(
      "[startup] No Zerodha auth in DB. Login to Kite and store token first."
    );
  }

  const validation = await validateKiteSession({ forceReload: true });
  if (!validation.ok) {
    logger.error({ reason: validation.reason }, "[startup] auth validation failed");
    await ensureKiteSession({ forceRefresh: true });
    const post = await validateKiteSession({ forceReload: true });
    if (!post.ok) {
      throw new Error(`[startup] Unable to validate Zerodha session: ${post.reason}`);
    }
  }

  // Build today's universe FIRST (so 'universe' is defined)
  const rawUniverse = await loadTodayUniverse();
  const universe = validateUniverse(rawUniverse);

  // Candle storage + optional historical preload
  const candleStore = createCandleStore(universe);
  await preloadSession({ universe, candleStore });

  // PnL + positions
  const pnlTracker = createPnlTracker();
  const positionTracker = createPositionTracker({ pnlTracker });
  const exitManager = createExitManager({ positionTracker });

  // Strategy pipeline listens to candle close events
  hookPipeline({ candleStore, pnlTracker, positionTracker, exitManager });

  // Force square-off near close
  startMarketClock({ positionTracker });

  // Start Zerodha live ticks -> candles -> strategy
  await startTickStream({
    universe,
    candleStore,
    positionTracker,
    pnlTracker,
  });

  logger.info({ count: universe.length }, "[startup] service initialized");
  return { universe, candleStore, positionTracker, pnlTracker, exitManager };
}
