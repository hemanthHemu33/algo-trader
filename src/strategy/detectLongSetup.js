// src/strategy/detectLongSetup.js
// decide if we WANT to go long on this candle

export function detectLongSetup({ symbol, candle, features }) {
  if (!candle || !features) return null;

  const { emaFast, emaSlow } = features;

  // 1. basic uptrend filter: fast EMA above slow EMA
  const uptrend = emaFast != null && emaSlow != null ? emaFast > emaSlow : true;

  // 2. candle closed strong near high
  const range = candle.high - candle.low;
  const strongClose =
    range > 0 ? (candle.close - candle.low) / range >= 0.8 : false;

  if (!uptrend || !strongClose) {
    return null;
  }

  const entry = candle.close;
  const stopLoss = candle.low;
  const risk = entry - stopLoss;
  if (risk <= 0) {
    return null;
  }

  const target = entry + 2 * risk; // 1:2 RR default

  return {
    symbol,
    wantsLong: true,
    entry,
    stopLoss,
    target,
    confidence: 0.6,
    reason: "strong_close_uptrend",
  };
}
