// src/features/buildFeatureFrame.js
import { calcEMA, calcATR } from "./indicators.js";
import { strategyConfig } from "../config/strategyConfig.js";

/**
 * buildFeatureFrame(series)
 * series = array of candle objects oldest -> newest
 * candle = { ts, open, high, low, close, volume }
 */
export function buildFeatureFrame(series) {
  if (!Array.isArray(series) || series.length === 0) {
    return {
      lastClose: null,
      lastHigh: null,
      lastLow: null,
      emaFast: null,
      emaSlow: null,
      atr: null,
    };
  }

  const last = series[series.length - 1];

  const emaFast = calcEMA(series, strategyConfig.EMA_FAST);
  const emaSlow = calcEMA(series, strategyConfig.EMA_SLOW);
  const atrVal = calcATR(series, strategyConfig.ATR_PERIOD);

  return {
    lastClose: last.close,
    lastHigh: last.high,
    lastLow: last.low,
    emaFast,
    emaSlow,
    atr: atrVal,
  };
}
