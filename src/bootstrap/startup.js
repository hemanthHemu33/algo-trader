// src/bootstrap/startup.js
import { getDb } from "../data/mongoConnection.js";
import { getZerodhaAuth } from "../data/brokerToken.js";
import { loadTodayUniverse } from "../universe/loadTodayUniverse.js";
import { validateUniverse } from "../universe/validateUniverse.js";
import { logger } from "../utils/logger.js";
import { ensureKiteSession, validateKiteSession } from "../data/kiteSession.js";

export async function startup() {
  logger.info("[startup] beginning service initialization");

  logger.info("[startup] connecting to database");
  await getDb();
  logger.info("[startup] database connected");

  // Ensure Zerodha auth exists
  logger.info("[startup] fetching Zerodha auth token");
  const auth = await getZerodhaAuth({ forceRefresh: true });
  const hasSession = !!(auth.accessToken || auth.encToken);
  if (hasSession) {
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
  } else {
    logger.warn(
      "[startup] No Zerodha auth found. Trading actions will remain disabled until a session token is stored in Mongo."
    );
  }

  // Build today's universe FIRST (so 'universe' is defined)
  logger.info("[startup] loading today's trading universe");
  const rawUniverse = await loadTodayUniverse();
  const universe = validateUniverse(rawUniverse);
  logger.info({ count: universe.length }, "[startup] universe validated");

  logger.info(
    "[startup] live market data ingestion has been moved to scanner-app; no tick stream will be started"
  );
  logger.info(
    "[startup] startup complete (orders should be triggered by Mongo-driven scalping runtime)"
  );
  return { universe, brokerAuthReady: hasSession };
}
