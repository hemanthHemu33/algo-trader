// src/features/indicators.js

// Exponential Moving Average of closing prices
export function calcEMA(series, period) {
  // series is array of candles oldest -> newest
  // each candle: { close }
  if (!Array.isArray(series) || series.length === 0) return null;
  const k = 2 / (period + 1);
  let emaPrev = null;

  for (const candle of series) {
    const price = candle.close;
    if (price == null) continue;

    if (emaPrev == null) {
      emaPrev = price;
    } else {
      emaPrev = price * k + emaPrev * (1 - k);
    }
  }

  return emaPrev;
}

// Average True Range
export function calcATR(series, period) {
  // series oldest -> newest
  if (!Array.isArray(series) || series.length < period + 1) {
    return null;
  }

  const trs = [];
  for (let i = 1; i < series.length; i++) {
    const curr = series[i];
    const prev = series[i - 1];
    const highLow = curr.high - curr.low;
    const highPrevClose = Math.abs(curr.high - prev.close);
    const lowPrevClose = Math.abs(curr.low - prev.close);
    const tr = Math.max(highLow, highPrevClose, lowPrevClose);
    trs.push(tr);
  }

  // simple SMA of last `period` TR values
  const lastTR = trs.slice(-period);
  const sum = lastTR.reduce((a, b) => a + b, 0);
  return sum / lastTR.length;
}
