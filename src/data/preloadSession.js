// src/data/preloadSession.js
import { logger } from "../utils/logger.js";

/**
 * In final version:
 *  - Call Zerodha historical candles API for each symbol in `universe`
 *  - Convert into [{ts, open, high, low, close, volume}, ...]
 *  - Feed to candleStore.addHistoricalCandles(symbol, arr)
 *
 * For now:
 *  - We'll just seed with an empty array (or mock candles if you want indicators to not be NaN).
 */

export async function preloadSession({ universe, candleStore }) {
  logger.info({ universe }, "[preloadSession] starting preload for symbols");

  for (const symbol of universe) {
    // Placeholder: push no historical candles (empty array)
    // Later you'll replace this with actual historical 1m data.
    candleStore.addHistoricalCandles(symbol, []);
  }

  logger.info({ count: universe.length }, "[preloadSession] done (stub)");
}
