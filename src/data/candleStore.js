// src/data/candleStore.js
import { logger } from "../utils/logger.js";

/**
 * candle shape:
 * {
 *   ts: Date,
 *   open: number,
 *   high: number,
 *   low: number,
 *   close: number,
 *   volume: number
 * }
 */

export function createCandleStore(symbolList = []) {
  // candlesBySymbol[symbol] = [candle, candle, ...] oldest -> newest
  const candlesBySymbol = {};
  const onCloseSubscribers = [];

  // init arrays
  for (const sym of symbolList) {
    candlesBySymbol[sym] = [];
  }

  function ensure(sym) {
    if (!candlesBySymbol[sym]) {
      candlesBySymbol[sym] = [];
    }
    return candlesBySymbol[sym];
  }

  /**
   * Seed historical candles (from preloadSession)
   */
  function addHistoricalCandles(symbol, arr) {
    const bucket = ensure(symbol);
    if (Array.isArray(arr) && arr.length) {
      for (const c of arr) {
        bucket.push(c);
      }
    }
  }

  /**
   * Push a newly CLOSED 1m candle.
   * After pushing, notify subscribers.
   */
  function addClosedCandle(symbol, candle) {
    const bucket = ensure(symbol);
    bucket.push(candle);

    const snapshot = bucket.slice(); // oldest -> newest
    for (const cb of onCloseSubscribers) {
      try {
        cb({
          symbol,
          candle,
          series: snapshot,
        });
      } catch (err) {
        logger.warn(
          { symbol, err: err.message },
          "[candleStore] onClose subscriber error"
        );
      }
    }
  }

  /**
   * getRecentCandles(symbol, lookback = 50)
   * returns last N candles oldest -> newest
   */
  function getRecentCandles(symbol, lookback = 50) {
    const bucket = ensure(symbol);
    if (bucket.length <= lookback) {
      return bucket.slice();
    }
    return bucket.slice(bucket.length - lookback);
  }

  /**
   * Register a subscriber that runs whenever a candle closes.
   * cb({ symbol, candle, series })
   */
  function onCandleClose(cb) {
    if (typeof cb === "function") {
      onCloseSubscribers.push(cb);
    }
  }

  return {
    addHistoricalCandles,
    addClosedCandle,
    getRecentCandles,
    onCandleClose,
  };
}
