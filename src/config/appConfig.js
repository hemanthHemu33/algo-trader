// src/config/appConfig.js
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";

dotenv.config();

function warnDefault(name, value) {
  logger.warn({ name, value }, `[config] using default value for ${name}`);
}

function str(name, def) {
  const val = process.env[name];
  if (val === undefined || val === "") {
    if (def !== undefined) warnDefault(name, def);
    return def;
  }
  return val;
}

function num(name, def) {
  const raw = process.env[name];
  const parsed = raw !== undefined ? Number(raw) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    if (def !== undefined) warnDefault(name, def);
    return def;
  }
  return parsed;
}

const defaultMongoUri = "mongodb://127.0.0.1:27017/scanner_app";

export const APP_CONFIG = {
  env: process.env.NODE_ENV || "development",
  mongo: {
    uri: str("MONGO_URI", defaultMongoUri),
    dbName: str("MONGO_DB", undefined),
  },
  zerodha: {
    apiKey: str("ZERODHA_API_KEY", null),
    apiSecret: str("ZERODHA_API_SECRET", null),
    userId: str("ZERODHA_USER_ID", null),
  },
  scalping: {
    maxRiskPerTradePct: num("SCALPING_MAX_RISK_PER_TRADE_PCT", 0.5),
    maxDailyLossPct: num("SCALPING_MAX_DAILY_LOSS_PCT", 2),
    maxOpenPositions: num("SCALPING_MAX_OPEN_POSITIONS", 3),
    allowedStartTime: str("SCALPING_ALLOWED_START_TIME", "09:20"),
    allowedEndTime: str("SCALPING_ALLOWED_END_TIME", "14:45"),
    timeframe: str("SCALPING_TIMEFRAME", "1m"),
    atrThreshold: num("SCALPING_ATR_THRESHOLD", 0.35),
    minVolume: num("SCALPING_MIN_VOLUME", 200000),
    vwapBufferPct: num("SCALPING_VWAP_BUFFER_PCT", 0.0005),
    rrMultiple: num("SCALPING_RR_MULTIPLE", 1.2),
    stopBufferPct: num("SCALPING_STOP_BUFFER_PCT", 0.0035),
    minConfidence: num("SCALPING_MIN_CONFIDENCE", 0.4),
    capital: num("SCALPING_CAPITAL_RS", 500000),
    minLotSize: num("SCALPING_MIN_LOT_SIZE", 1),
    maxOrderQty: num("SCALPING_MAX_ORDER_QTY", 2000),
  },
  collections: {
    candles: str("CANDLES_COLLECTION", "intraday_candles"),
    signals: str("SIGNALS_COLLECTION", "strategy_signals"),
    positions: str("POSITIONS_COLLECTION", "open_positions"),
    tradeLogs: str("TRADE_LOGS_COLLECTION", "trade_logs"),
  },
};

if (!process.env.MONGO_URI) {
  warnDefault("MONGO_URI", defaultMongoUri);
}

export function logConfigSummary() {
  logger.info(
    {
      env: APP_CONFIG.env,
      mongo: {
        uri: APP_CONFIG.mongo.uri,
        dbName: APP_CONFIG.mongo.dbName,
      },
      scalping: {
        timeframe: APP_CONFIG.scalping.timeframe,
        maxOpenPositions: APP_CONFIG.scalping.maxOpenPositions,
        riskPerTradePct: APP_CONFIG.scalping.maxRiskPerTradePct,
      },
      collections: APP_CONFIG.collections,
    },
    "[config] loaded application config"
  );
}
