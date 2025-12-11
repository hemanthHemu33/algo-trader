// src/data/mongoConnection.js
import { MongoClient } from "mongodb";
import { APP_CONFIG, logConfigSummary } from "../config/appConfig.js";
import { logger } from "../utils/logger.js";

let client;
let db;

async function connect() {
  if (db) return db;

  const uri = APP_CONFIG.mongo.uri;
  const dbName = APP_CONFIG.mongo.dbName;
  if (!uri) throw new Error("[mongo] MONGO_URI missing");

  logConfigSummary();

  client = new MongoClient(uri, {
    maxPoolSize: 50,
    retryReads: true,
    retryWrites: true,
  });

  client.on("close", () => {
    logger.warn("[mongo] connection closed. attempts to reconnect will follow on demand");
    db = undefined;
  });
  client.on("error", (err) => {
    logger.error({ err }, "[mongo] driver error");
  });

  await client.connect();
  db = client.db(dbName);
  logger.info({ dbName }, "[mongo] connected");
  await ensureIndexes();
  return db;
}

async function ensureIndexes() {
  if (!db) return;
  const signals = db.collection(APP_CONFIG.collections.signals);
  const candles = db.collection(APP_CONFIG.collections.candles);
  const positions = db.collection(APP_CONFIG.collections.positions);
  const tradeLogs = db.collection(APP_CONFIG.collections.tradeLogs);

  await signals.createIndex({ symbol: 1, strategyType: 1, createdAt: -1 });
  await candles.createIndex({ symbol: 1, timeframe: 1, timestamp: -1 });
  await positions.createIndex({ symbol: 1, openedAt: -1 });
  await tradeLogs.createIndex({ symbol: 1, closedAt: -1 });
}

export async function getDb() {
  if (!db) {
    await connect();
  }
  return db;
}

export async function getCollection(name) {
  const database = await getDb();
  return database.collection(name);
}

export async function closeMongo() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}
