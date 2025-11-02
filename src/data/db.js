// src/data/db.js
import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";
import { logger } from "../utils/logger.js";
import { ENV } from "../config/env.js";

let _client = null;
let _db = null;
let _memoryServer = null;

// We will connect using ENV.MONGO_URI from algo-trader .env
// ENV.MONGO_URI should look like either:
//   mongodb://127.0.0.1:27017/scanner_app
// or
//   mongodb+srv://user:pass@cluster.mongodb.net/scanner_app
//
// IMPORTANT: for Atlas style URIs that include the DB in the URI,
// ENV.MONGO_URI should ALREADY include the correct db name at the end.
// We'll still try to pick DB name from the URI automatically.

function getDbNameFromUri(uri) {
  // naive DB name resolver:
  // - mongodb://host:port/dbName  -> dbName
  // - mongodb+srv://.../dbName    -> dbName
  // - if there's no "/dbname" at end, fall back to "scanner_app"
  try {
    const afterSlash = uri.split("/").slice(3).join("/"); // drop "mongodb://host:port"
    const firstPart = afterSlash.split("?")[0];
    if (firstPart && firstPart.trim().length > 0) {
      return firstPart.trim();
    }
  } catch {
    /* ignore */
  }
  return "scanner_app";
}

/**
 * ensureIndexes()
 *
 * This is where we prep collections that algo-trader cares about.
 * We're NOT copying all scanner indexes. We're creating only what
 * this service will query often.
 *
 * Collections in algo-trader:
 *
 * - tokens
 *   Holds kite_session info:
 *   { access_token, api_key, enctoken, user_id, login_time, ... }
 *   We might query latest login. We'll want an index on login_time desc.
 *
 * - top_stock_symbols
 *   Holds your preopen universe:
 *   { _id: "2025-10-31:preopen", symbols: [ "NSE:UNIONBANK", ... ], createdAtIST: ... }
 *   We usually just `findOne({})`, but adding createdAtIST index is cheap.
 *
 * - trade_journal / executions / positions (future)
 *   We'll likely store closed trades, realized pnl, etc.
 *   We'll create basic time indexes ahead of time.
 */

async function ensureIndexes(db) {
  if (!db || typeof db.collection !== "function") return;

  // 1. tokens: index latest login_time so we can sort by it quickly if needed
  await db.collection("tokens").createIndex({ login_time: -1 });

  // 2. top_stock_symbols: index createdAtIST so we can grab "latest pick"
  await db.collection("top_stock_symbols").createIndex({ createdAtIST: -1 });

  // 3. positions / open orders (not yet fully used but future-proof)
  // open_positions: current live trades the algo is managing.
  // We'll likely look them up by symbol in realtime.
  await db.collection("open_positions").createIndex({ symbol: 1 });

  // 4. trade_journal: closed trades / realized P&L history.
  // We'll usually query recent trades for the day (by closedAt).
  await db.collection("trade_journal").createIndex({ closedAt: -1 });
}

/**
 * connectDb()
 *
 * - single global client for this process
 * - retries with backoff (like scanner)
 * - supports NODE_ENV=test using mongodb-memory-server (so you can unit test later)
 */
export async function connectDb(attempt = 0) {
  if (_db) return _db;

  // --- test env in-memory DB (handy for unit tests / CI) ---
  if (ENV.NODE_ENV === "test") {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    _memoryServer = await MongoMemoryServer.create();
    const memUri = _memoryServer.getUri();

    logger.info({ memUri }, "[db] starting in-memory Mongo for test");

    _client = new MongoClient(memUri);
    await _client.connect();

    _db = _client.db("test_db"); // arbitrary name in memory
    await ensureIndexes(_db);

    logger.info("[db] connected (in-memory test)");
    return _db;
  }

  // --- normal runtime path ---
  const MAX = 5;
  const backoff = (ms) => new Promise((r) => setTimeout(r, ms));

  const uri = ENV.MONGO_URI;
  if (!uri) {
    throw new Error("[db] ENV.MONGO_URI is not set");
  }

  // pick dbName from URI if not explicitly provided
  const dbName = getDbNameFromUri(uri);

  try {
    if (!_client) {
      logger.info(
        { uri: sanitizeMongoUriForLogs(uri), dbName },
        "[db] connecting to Mongo..."
      );
      _client = new MongoClient(uri, {
        maxPoolSize: 100,
      });
      await _client.connect();
    }

    _db = _client.db(dbName);

    await ensureIndexes(_db);

    logger.info({ dbName }, "[db] connected");

    return _db;
  } catch (err) {
    logger.error({ err: err.message, attempt }, "[db] Mongo connection failed");

    if (attempt >= MAX) {
      throw err;
    }

    const wait = Math.pow(2, attempt) * 1000; // 0s,1s,2s,4s,8s...
    logger.warn({ waitMs: wait }, "[db] retrying connection");
    await backoff(wait);
    return connectDb(attempt + 1);
  }
}

/**
 * getDb()
 *
 * - Call this from anywhere else in the code (brokerToken.js, loadTodayUniverse.js, etc.)
 * - If we haven't connected yet, this will connect first.
 */
export function getDb() {
  if (!_db) {
    throw new Error("[db] getDb() called before connectDb()");
  }
  return _db;
}

/**
 * closeDb()
 *
 * - Graceful shutdown helper
 * - We'll call this on process exit if we want to cleanly close Mongo.
 */
export async function closeDb() {
  try {
    if (_client) {
      await _client.close();
    }
    if (_memoryServer) {
      await _memoryServer.stop();
    }
    _client = null;
    _db = null;
    _memoryServer = null;
    logger.info("[db] closed");
  } catch (err) {
    logger.warn({ err: err.message }, "[db] error while closing mongo");
  }
}

/**
 * sanitizeMongoUriForLogs(uri)
 *
 * We don't want to leak username/password in logs,
 * so this just hides credentials while still letting us see host/db.
 */
function sanitizeMongoUriForLogs(uri) {
  try {
    // ex: mongodb+srv://user:pass@cluster0.x.mongodb.net/scanner_app?retryWrites=true
    const parts = uri.split("@");
    if (parts.length === 2) {
      const left = parts[0]; // 'mongodb+srv://user:pass'
      const right = parts[1]; // 'cluster0.x.mongodb.net/scanner_app?...'
      const leftProto = left.split("://")[0] + "://****:****";
      return leftProto + "@" + right;
    }
    return uri;
  } catch {
    return uri;
  }
}

// Hook graceful shutdown in dev/prod similarly to your scanner version
process.once("exit", async () => {
  if (ENV.NODE_ENV === "test") {
    // test mode already handled auto-stop in scanner version
    // but we still do cleanup here to be safe
    await closeDb();
  }
});
