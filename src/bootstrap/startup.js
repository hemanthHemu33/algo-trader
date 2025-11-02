// src/bootstrap/startup.js
import { connectDb } from "../data/db.js";
import { getZerodhaAuth } from "../data/brokerToken.js";
import { loadTodayUniverse } from "../universe/loadTodayUniverse.js";
import { validateUniverse } from "../universe/validateUniverse.js";

import { createCandleStore } from "../data/candleStore.js";
import { preloadSession } from "../data/preloadSession.js";
import { startTickStream } from "../data/kiteStream.js";
import { startMarketClock } from "../data/marketClock.js";

import { createPositionTracker } from "../execution/positionTracker.js";
import { createPnlTracker } from "../journal/pnlTracker.js";
import { createExitManager } from "../execution/exitManager.js";

import { logger } from "../utils/logger.js";

export async function startup() {
  // 1. DB connect
  await connectDb();

  // 2. Load Zerodha credentials from Mongo
  const brokerAuth = await getZerodhaAuth({ forceRefresh: true });

  // 3. Today's universe (from top_stock_symbols with fallback if empty)
  const rawUniverse = await loadTodayUniverse();
  const universe = validateUniverse(rawUniverse);

  // 4. In-memory runtime state
  const candleStore = createCandleStore(universe);
  const positionTracker = createPositionTracker();
  const pnlTracker = createPnlTracker();
  const exitManager = createExitManager({ positionTracker, pnlTracker });

  // 5. Preload some candles (right now a stub/random history)
  await preloadSession({ universe, candleStore });

  // 6. Start tick stream
  //    - Registers candle close pipeline
  //    - Generates sample closed candles so you SEE trades right now
  await startTickStream({
    universe,
    candleStore,
    positionTracker,
    pnlTracker,
    exitManager,
  });

  // 7. Risk enforcement / EOD square-off loop
  startMarketClock({ exitManager, pnlTracker });

  logger.info({ count: universe.length }, "[startup] service initialized");

  return {
    brokerAuth,
    universe,
    candleStore,
    positionTracker,
    pnlTracker,
    exitManager,
  };
}
