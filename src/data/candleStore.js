import { logger } from "../utils/logger.js";

/**
 * candle object we expect:
 * {
 *   ts: Date,
 *   open: number,
 *   high: number,
 *   low: number,
 *   close: number,
 *   volume: number
 * }
 */

export function createCandleStore(symbolList) {
  // candles[symbol] = [ ..., {ts,open,high,low,close,volume} ]
  const candles = {};
  for (const s of symbolList) {
    candles[s] = [];
  }

  // subscribers called when we finalize a 1m candle close
  const onCloseSubscribers = [];

  function addHistoricalCandles(symbol, candleArray) {
    if (!candles[symbol]) candles[symbol] = [];
    // push older candles first, then newer
    for (const c of candleArray) {
      candles[symbol].push(c);
    }
  }

  function addClosedCandle(symbol, candle) {
    if (!candles[symbol]) candles[symbol] = [];
    candles[symbol].push(candle);

    // notify listeners that a new completed candle is available
    for (const fn of onCloseSubscribers) {
      try {
        fn(symbol, candle, [...candles[symbol]]);
      } catch (err) {
        logger.error({ err }, "[candleStore] onCloseSubscriber crashed");
      }
    }
  }

  function getRecentCandles(symbol, lookback = 60) {
    const arr = candles[symbol] || [];
    if (arr.length <= lookback) return [...arr];
    return arr.slice(arr.length - lookback);
  }

  function onCandleClose(callbackFn) {
    onCloseSubscribers.push(callbackFn);
  }

  return {
    addHistoricalCandles,
    addClosedCandle,
    getRecentCandles,
    onCandleClose,
  };
}
