// src/config/env.js
import dotenv from "dotenv";

dotenv.config(); // load .env if present

function requireEnv(name, fallback = undefined) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`[env] Missing required env var ${name}`);
  }
  return v;
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",

  // we always connect to the same Mongo cluster as scanner_app
  // example:
  //   MONGO_URI=mongodb+srv://user:pass@cluster0.../scanner_app
  MONGO_URI: requireEnv("MONGO_URI"),

  // Zerodha API key for your app; access_token comes from DB (`tokens` collection)
  ZERODHA_API_KEY: process.env.ZERODHA_API_KEY || null,
  ZERODHA_API_SECRET: process.env.ZERODHA_API_SECRET || null,

  PORT: parseInt(process.env.PORT || "8080", 10),

  MAX_DAILY_LOSS_RS: parseInt(process.env.MAX_DAILY_LOSS_RS || "2000", 10),
  MAX_RISK_PER_TRADE_RS: parseInt(
    process.env.MAX_RISK_PER_TRADE_RS || "500",
    10
  ),
  MAX_CONCURRENT_TRADES: parseInt(process.env.MAX_CONCURRENT_TRADES || "1", 10),

  // trading costs + sizing safety margins
  ENTRY_SLIPPAGE_PCT: parseFloat(process.env.ENTRY_SLIPPAGE_PCT || "0.001"),
  EXIT_SLIPPAGE_PCT: parseFloat(process.env.EXIT_SLIPPAGE_PCT || "0.001"),
  ROUND_TRIP_CHARGES_PCT: parseFloat(
    process.env.ROUND_TRIP_CHARGES_PCT || "0.0009"
  ),
  BROKERAGE_PER_ORDER_RS: parseFloat(
    process.env.BROKERAGE_PER_ORDER_RS || "20"
  ),

  // lot sizes + caps
  DEFAULT_LOT_SIZE: parseInt(process.env.DEFAULT_LOT_SIZE || "1", 10),
  DEFAULT_MAX_ORDER_QTY: parseInt(
    process.env.DEFAULT_MAX_ORDER_QTY || "2000",
    10
  ),
  NSE_EQUITY_LOT_SIZE: parseInt(process.env.NSE_EQUITY_LOT_SIZE || "1", 10),
  NSE_EQUITY_MAX_ORDER_QTY: parseInt(
    process.env.NSE_EQUITY_MAX_ORDER_QTY || "2000",
    10
  ),

  // margin guardrail settings
  MARGIN_FAILURE_THRESHOLD: parseInt(
    process.env.MARGIN_FAILURE_THRESHOLD || "3",
    10
  ),
  MARGIN_CIRCUIT_COOLDOWN_MS: parseInt(
    process.env.MARGIN_CIRCUIT_COOLDOWN_MS || "60000",
    10
  ),

  ENTRY_CUTOFF_IST: process.env.ENTRY_CUTOFF_IST || "15:00",
  FORCE_EXIT_IST: process.env.FORCE_EXIT_IST || "15:20",
  MARKET_OPEN_IST: process.env.MARKET_OPEN_IST || "09:15",
};
