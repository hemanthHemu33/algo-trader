// src/data/brokerToken.js
import { getDb } from "./db.js";
import { logger } from "../utils/logger.js";
import { ENV } from "../config/env.js";

let _cachedAuth = null;

async function loadLatestTokenDoc() {
  const db = getDb();

  // We expect exactly one doc like the one you pasted:
  // {
  //   type: "kite_session",
  //   access_token: "...",
  //   api_key: "...",
  //   user_id: "GGV395",
  //   login_time: <date>,
  //   ...
  // }
  const doc = await db.collection("tokens").findOne(
    { type: "kite_session" },
    {
      sort: {
        login_time: -1,
        _id: -1,
      },
    }
  );

  if (!doc) {
    logger.warn("[brokerToken] tokens collection is empty");
    return null;
  }
  return doc;
}

export async function getZerodhaAuth({ forceRefresh = false } = {}) {
  if (_cachedAuth && !forceRefresh) {
    return _cachedAuth;
  }

  const latest = await loadLatestTokenDoc();

  _cachedAuth = {
    apiKey: latest?.api_key || ENV.ZERODHA_API_KEY || null,
    accessToken: latest?.access_token || null,
    encToken: latest?.enctoken || null,
    publicToken: latest?.public_token || null,
    userId: latest?.user_id || null,
    loginTime: latest?.login_time || null,
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
