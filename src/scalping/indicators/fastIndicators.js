// src/scalping/indicators/fastIndicators.js
import { ema } from "../../features/indicators.js";

/**
 * Compute VWAP using the provided candles (recent first or oldest first).
 */
export function computeVwap(candles, lookback = 20) {
  if (!candles || candles.length === 0) return null;
  const slice = candles.slice(-lookback);
  let pvSum = 0;
  let volSum = 0;

  for (const c of slice) {
    const typical = (c.high + c.low + c.close) / 3;
    pvSum += typical * (c.volume || 0);
    volSum += c.volume || 0;
  }

  if (volSum === 0) return null;
  return pvSum / volSum;
}

export function computeEma(values, period) {
  return ema(values, period);
}

export function computeSlope(values, lookback = 3) {
  if (!values || values.length < lookback) return 0;
  const last = values[values.length - 1];
  const prev = values[values.length - lookback];
  if (!prev) return 0;
  return (last - prev) / prev;
}

export function computeVolumeProfile(candles, lookback = 30) {
  if (!candles || candles.length === 0) return { avg: null, last: null };
  const slice = candles.slice(-lookback);
  const vols = slice.map((c) => c.volume || 0);
  const avg = vols.reduce((a, b) => a + b, 0) / vols.length;
  return { avg, last: vols[vols.length - 1] };
}

export function candleRange(candle) {
  if (!candle) return 0;
  return (candle.high ?? 0) - (candle.low ?? 0);
}
