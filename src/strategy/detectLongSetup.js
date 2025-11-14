// src/strategy/detectLongSetup.js
export function detectLongSetup(symbol, frame) {
  const { last, emaFast, emaSlow, prevHigh, volSpike } = frame;

  if (!last || emaFast == null || emaSlow == null) {
    return null;
  }

  const entry = last.close;
  const stopLoss = last.low; // you can pad a few paise if you want
  const breakout = entry > prevHigh;
  const trendOk = emaFast > emaSlow;
  const volumeOk = !!volSpike;

  if (!breakout || !trendOk || !volumeOk) {
    return null;
  }

  const riskPerShare = entry - stopLoss;
  if (riskPerShare <= 0) {
    return null;
  }

  const target = entry + riskPerShare * 1.5; // RR 1:1.5

  return {
    symbol,
    direction: "LONG",
    entry,
    stopLoss,
    target,
    reason: "bullish_breakout",
    confidence: 0.8, // rough score 0..1 for now
  };
}
