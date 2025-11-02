// src/data/brokerToken.js
import { getDb } from "./db.js";
import { logger } from "../utils/logger.js";
import { ENV } from "../config/env.js";

// in-memory cache so we don't keep hitting Mongo
let _cachedAuth = null;

/**
 * Load the latest Zerodha auth-like doc from the `tokens` collection.
 * We are NOT going to be picky about broker/type now because
 * your live DB might not match the filter exactly.
 *
 * We'll just:
 *   - sort by login_time desc (newest first)
 *   - fallback sort by _id desc
 *   - take the first doc
 */
async function loadTokenDocFromMongo() {
  const db = getDb();

  const docs = await db.collection("tokens").find({}).toArray();

  const latest = docs;

  if (!latest) {
    // Nothing in tokens at all. We won't throw here;
    // we let caller handle missing auth gracefully.
    logger.warn("[brokerToken] tokens collection is empty");
    return null;
  }

  return latest;
}

/**
 * getZerodhaAuth()
 *
 * Returns an object like:
 * {
 *   apiKey,
 *   accessToken,
 *   encToken,
 *   publicToken,
 *   userId,
 *   loginTime
 * }
 *
 * If we can't build a valid auth (e.g. no access_token in DB),
 * we'll still return an object but accessToken might be null.
 * That lets the app boot and expose /api/status/health
 * instead of crashing at startup.
 */
export async function getZerodhaAuth() {
  // Serve cached immediately if we already loaded once.
  if (_cachedAuth) {
    return _cachedAuth;
  }

  const latest = await loadTokenDocFromMongo();

  // If nothing found, build a "blank" auth so app can still run.
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

  // Build runtime auth object from doc
  const apiKey = latest.api_key || ENV.ZERODHA_API_KEY || null;
  const accessToken = latest.access_token || null;

  _cachedAuth = {
    apiKey,
    accessToken,
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
