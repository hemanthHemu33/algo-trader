// src/scalping/runtime/startScalpingScanner.js
import { logger } from "../../utils/logger.js";

/**
 * Legacy scanner entrypoint is intentionally disabled inside algo-trader.
 * Live data ingestion now belongs solely to scanner-app; this placeholder
 * remains to avoid breaking imports but will refuse to start a tick stream.
 */
export async function startScalpingScanner() {
  logger.warn(
    "[scalping] startScalpingScanner is disabled. Use scanner-app for market data ingestion."
  );
  return { candleHub: null, config: null };
}
