// src/bootstrap/startup.js
import { connectDb } from "../data/db.js";
import { getZerodhaAuth } from "../data/brokerToken.js";
import { loadTodayUniverse } from "../universe/loadTodayUniverse.js";
import { validateUniverse } from "../universe/validateUniverse.js";
import { createCandleStore } from "../data/candleStore.js";
import { preloadSession } from "../data/preloadSession.js";
import { startTickStream } from "../data/kiteStream.js";
import { createPositionTracker } from "../execution/positionTracker.js";
import { createPnlTracker } from "../journal/pnlTracker.js";
import { logger } from "../utils/logger.js";

export async function startup() {
  // 1. DB first
  await connectDb();

  // 2. Load broker credentials (cached for later REST/WebSocket usage)
  await getZerodhaAuth({ forceRefresh: true });

  // 3. Build today's trading universe
  const rawUniverse = await loadTodayUniverse();
  const universe = validateUniverse(rawUniverse);

  // 4. Local runtime state
  const candleStore = createCandleStore(universe);
  const positionTracker = createPositionTracker();
  const pnlTracker = createPnlTracker();

  // 5. Preload historical candles (currently stub)
  await preloadSession({ universe, candleStore });

  // 6. Start tick stream (currently stub, but wires pipeline for candle close)
  await startTickStream({
    universe,
    candleStore,
    positionTracker,
    pnlTracker,
  });

  logger.info({ count: universe.length }, "[startup] service initialized");

  return {
    universe,
    candleStore,
    positionTracker,
    pnlTracker,
  };
}
