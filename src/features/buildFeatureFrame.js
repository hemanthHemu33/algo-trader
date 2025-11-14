// src/features/buildFeatureFrame.js
import { ema, atr, sma } from "./indicators.js";

export function buildFeatureFrame(candles) {
  // need at least ~30 candles
  if (!candles || candles.length < 30) return null;

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  // highs of last few candles (excluding current) for breakout check
  const recentHighs = candles
    .slice(candles.length - 5, candles.length - 1)
    .map((c) => c.high);
  const prevHigh = Math.max(...recentHighs);

  const closes = candles.map((c) => c.close);
  const vols = candles.map((c) => c.volume);

  const emaFast = ema(closes.slice(-20), 9);
  const emaSlow = ema(closes.slice(-30), 21);

  const atr14 = atr(candles.slice(-20), 14);

  const avgVol20 = sma(vols.slice(-20));
  const volSpike = last.volume > avgVol20 * 1.5; // volume thrust

  return {
    last,
    prev,
    emaFast,
    emaSlow,
    atr14,
    prevHigh,
    volSpike,
    avgVol20,
  };
}
