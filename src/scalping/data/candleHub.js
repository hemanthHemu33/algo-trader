// src/scalping/data/candleHub.js
import { createCandleStore } from "../../data/candleStore.js";
import { logger } from "../../utils/logger.js";

/**
 * Thin wrapper around candleStore tuned for scalping:
 * - keeps only the last N candles per symbol in memory
 * - exposes a simple subscription hook
 * - tracks health timestamps for monitoring
 */
export function createScalpingCandleHub({ universe, maxCandles = 240 }) {
  const candleStore = createCandleStore(universe, { maxCandles });
  const health = {
    lastTickAt: null,
    lastCandleAt: null,
  };

  function addClosedCandle(symbol, candle) {
    candleStore.addClosedCandle(symbol, candle);
    health.lastCandleAt = Date.now();
  }

  function onNewCandle(cb) {
    candleStore.onCandleClose((payload) => {
      try {
        cb(payload);
      } catch (err) {
        logger.error({ err }, "[candleHub] subscriber threw");
      }
    });
  }

  function markTick() {
    health.lastTickAt = Date.now();
  }

  return {
    addClosedCandle,
    onNewCandle,
    getRecentCandles: candleStore.getRecentCandles,
    getLastCandle: candleStore.getLastCandle,
    markTick,
    health,
    raw: candleStore,
  };
}
