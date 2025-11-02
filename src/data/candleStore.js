// src/data/candleStore.js
import { logger } from "../utils/logger.js";

/**
 * candle: { ts, open, high, low, close, volume }
 * We keep arrays per symbol, oldest -> newest.
 */
export function createCandleStore(symbolList = []) {
  const candlesBySymbol = {};
  const onCloseSubscribers = [];

  for (const sym of symbolList) {
    candlesBySymbol[sym] = [];
  }

  function ensure(sym) {
    if (!candlesBySymbol[sym]) candlesBySymbol[sym] = [];
    return candlesBySymbol[sym];
  }

  // preload historical candles from preloadSession()
  function addHistoricalCandles(symbol, arr) {
    const bucket = ensure(symbol);
    if (Array.isArray(arr) && arr.length) {
      for (const c of arr) {
        bucket.push(c);
      }
    }
  }

  // called when a 1-min candle is CLOSED
  function addClosedCandle(symbol, candle) {
    const bucket = ensure(symbol);
    bucket.push(candle);

    const snapshot = bucket.slice(); // copy (oldest -> newest)
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

  function getRecentCandles(symbol, lookback = 50) {
    const bucket = ensure(symbol);
    if (bucket.length <= lookback) return bucket.slice();
    return bucket.slice(bucket.length - lookback);
  }

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
