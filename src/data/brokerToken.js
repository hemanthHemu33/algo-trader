// src/data/brokerToken.js
import { getDb } from "./mongoConnection.js";
import { logger } from "../utils/logger.js";
import { ENV } from "../config/env.js";

let _cachedAuth = null;

async function loadLatestTokenDoc() {
  const db = await getDb();

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
    refreshToken: latest?.refresh_token || null,
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

export async function saveZerodhaAuth(session) {
  const db = await getDb();

  const doc = {
    type: "kite_session",
    api_key: session.api_key || session.apiKey || ENV.ZERODHA_API_KEY || null,
    access_token: session.access_token || session.accessToken || null,
    refresh_token: session.refresh_token || session.refreshToken || null,
    enctoken: session.enctoken || session.encToken || null,
    public_token: session.public_token || session.publicToken || null,
    user_id: session.user_id || session.userId || null,
    login_time: session.login_time
      ? new Date(session.login_time)
      : new Date(),
    updated_at: new Date(),
    meta: session.meta || session.data || undefined,
  };

  await db.collection("tokens").insertOne(doc);

  _cachedAuth = {
    apiKey: doc.api_key,
    accessToken: doc.access_token,
    refreshToken: doc.refresh_token,
    encToken: doc.enctoken,
    publicToken: doc.public_token,
    userId: doc.user_id,
    loginTime: doc.login_time,
  };

  logger.info(
    { user: _cachedAuth.userId },
    "[brokerToken] Persisted Zerodha session to Mongo"
  );

  return _cachedAuth;
}
