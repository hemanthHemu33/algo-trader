// src/data/candleStore.js
import { logger } from "../utils/logger.js";

/**
 * candle = {
 *   ts: Date,
 *   open: number,
 *   high: number,
 *   low: number,
 *   close: number,
 *   volume: number
 * }
 */

export function createCandleStore(symbolList, options = {}) {
  const { maxCandles = 500 } = options;

  const _candles = {}; // { [symbol]: [candle, candle, ...] }
  const _subs = [];

  for (const s of symbolList) {
    _candles[s] = [];
  }

  function addHistoricalCandles(symbol, arr) {
    if (!_candles[symbol]) _candles[symbol] = [];
    _candles[symbol].push(...arr);
  }

  function addClosedCandle(symbol, candle) {
    if (!_candles[symbol]) _candles[symbol] = [];
    _candles[symbol].push(candle);

    // Trim to maxCandles to avoid unbounded memory usage in scalping mode
    if (_candles[symbol].length > maxCandles) {
      _candles[symbol].splice(0, _candles[symbol].length - maxCandles);
    }

    // notify pipeline
    for (const fn of _subs) {
      try {
        fn({
          symbol,
          candle,
          candles: _candles[symbol],
        });
      } catch (err) {
        logger.error(err, "[candleStore] subscriber error");
      }
    }
  }

  function getRecentCandles(symbol, lookback = 50) {
    const arr = _candles[symbol] || [];
    if (arr.length <= lookback) return [...arr];
    return arr.slice(arr.length - lookback);
  }

  function onCandleClose(cb) {
    _subs.push(cb);
  }

  function getLastCandle(symbol) {
    const arr = _candles[symbol] || [];
    return arr[arr.length - 1] || null;
  }

  return {
    addHistoricalCandles,
    addClosedCandle,
    getRecentCandles,
    onCandleClose,
    getLastCandle,
  };
}
