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
  await connectDb();

  const auth = await getZerodhaAuth({ forceRefresh: true });
  // we just load it so if it's missing we die fast
  // (auth not yet used below but we'll pass it to tickStream soon)
  // logger.info(...) is fine but optional

  let universe = await loadTodayUniverse();
  universe = validateUniverse(universe);

  const candleStore = createCandleStore(universe);

  await preloadSession({ universe, candleStore });

  const positionTracker = createPositionTracker();
  const pnlTracker = createPnlTracker();

  await startTickStream({
    universe,
    candleStore,
    positionTracker,
    pnlTracker,
  });

  return {
    universe,
    candleStore,
    positionTracker,
    pnlTracker,
  };
}
