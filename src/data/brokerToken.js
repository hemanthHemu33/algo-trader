// src/data/brokerToken.js
import { getDb } from "./db.js";
import { logger } from "../utils/logger.js";
import { ENV } from "../config/env.js";

// cache in memory for this process
let _cachedAuth = null;

// grab newest token doc (you usually only keep one anyway)
async function loadLatestTokenDocFromMongo() {
  const db = getDb();

  // If there's exactly one doc in "tokens", this will just return it.
  // If there are multiple, we prefer the most recent login_time.
  const cursor = db
    .collection("tokens")
    .find({})
    .sort({ login_time: -1, _id: -1 })
    .limit(1);

  const latest = await cursor.next();
  return latest || null;
}

/**
 * getZerodhaAuth()
 * returns:
 * {
 *   apiKey,
 *   accessToken,
 *   encToken,
 *   publicToken,
 *   userId,
 *   loginTime
 * }
 */
export async function getZerodhaAuth({ forceRefresh = false } = {}) {
  if (!forceRefresh && _cachedAuth) {
    return _cachedAuth;
  }

  const latest = await loadLatestTokenDocFromMongo();

  if (!latest) {
    _cachedAuth = {
      apiKey: ENV.ZERODHA_API_KEY || null,
      accessToken: null,
      encToken: null,
      publicToken: null,
      userId: null,
      loginTime: null,
    };

    logger.warn(
      "[brokerToken] No token doc found in DB. accessToken is null. Trading will be disabled."
    );

    return _cachedAuth;
  }

  _cachedAuth = {
    apiKey: latest.api_key || ENV.ZERODHA_API_KEY || null,
    accessToken: latest.access_token || null,
    encToken: latest.enctoken || null,
    publicToken: latest.public_token || null,
    userId: latest.user_id || null,
    loginTime: latest.login_time || null,
  };

  logger.info(
    {
      user: _cachedAuth.userId,
      hasAccessToken: !!_cachedAuth.accessToken,
      hasApiKey: !!_cachedAuth.apiKey,
    },
    "[brokerToken] Loaded Zerodha auth from Mongo"
  );

  return _cachedAuth;
}
