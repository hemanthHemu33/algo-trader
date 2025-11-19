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

  ENTRY_CUTOFF_IST: process.env.ENTRY_CUTOFF_IST || "15:00",
  FORCE_EXIT_IST: process.env.FORCE_EXIT_IST || "15:20",
  MARKET_OPEN_IST: process.env.MARKET_OPEN_IST || "09:15",
};
