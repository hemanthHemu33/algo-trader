import dotenv from "dotenv";

dotenv.config(); // loads .env if present

function requireEnv(name, fallback = undefined) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`[env] Missing required env var ${name}`);
  }
  return v;
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",

  // Mongo is still required because we now depend on it
  MONGO_URI: requireEnv("MONGO_URI"),

  // Some brokers (like Zerodha) need api_key & access_token.
  // We'll still expect API key in env unless you also store it in Mongo.
  ZERODHA_API_KEY: process.env.ZERODHA_API_KEY || null,

  // DO NOT pull access token from env anymore.
  // We'll load this dynamically from Mongo tokens collection.
  // ZERODHA_ACCESS_TOKEN is intentionally NOT here.

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
