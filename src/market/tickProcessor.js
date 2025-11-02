// src/market/tickProcessor.js
import { logger } from "../utils/logger.js";

/**
 * candleState[token] = {
 *   minuteKey: "YYYY-MM-DDTHH:MM",
 *   open, high, low, close,
 *   volume,
 *   tsFirst, tsLast
 * }
 */
const candleState = new Map();

/**
 * helper: format "YYYY-MM-DDTHH:MM" so we bucket ticks per minute.
 */
function minuteKeyFromDate(d) {
  // ISO like 2025-11-02T09:15
  return d.toISOString().slice(0, 16);
}

/**
 * Convert raw Zerodha tick to useful fields.
 * Zerodha tick looks like:
 * {
 *   instrument_token,
 *   last_price,
 *   volume,            // volume traded today
 *   ohlc: { open, high, low, close },
 *   timestamp,         // JS Date set by client lib
 *   ...
 * }
 * Fields are documented in KiteTicker examples. :contentReference[oaicite:5]{index=5}
 */
function normalizeTick(t) {
  const ts = t.timestamp ? new Date(t.timestamp) : new Date();
  return {
    token: t.instrument_token,
    price: t.last_price,
    volume: t.volume ?? t.volume_traded ?? 0,
    ts,
  };
}

/**
 * processTicks(ticks, emitClosedCandle)
 * - ticks: array from KiteTicker 'ticks' event (multiple instruments)
 * - emitClosedCandle: fn(symbol, candleObj)
 *
 * This updates in-progress candles and emits any candle that just closed.
 */
export function processTicks(ticks, tokenToSymbol, emitClosedCandle) {
  for (const raw of ticks) {
    const { token, price, volume, ts } = normalizeTick(raw);
    const sym = tokenToSymbol[String(token)];
    if (!sym) {
      // we got a tick for something we don't recognize
      continue;
    }

    const key = minuteKeyFromDate(ts);

    let state = candleState.get(token);

    // First tick for this token OR minute rolled over
    if (!state || state.minuteKey !== key) {
      // If we had an existing candle and we're rolling to new minute,
      // finalize and emit it.
      if (state) {
        emitClosedCandle(sym, {
          minuteKey: state.minuteKey,
          open: state.open,
          high: state.high,
          low: state.low,
          close: state.close,
          volume: state.volume,
          tsFirst: state.tsFirst,
          tsLast: state.tsLast,
        });
      }

      // start a new candle for this token
      state = {
        minuteKey: key,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume,
        tsFirst: ts,
        tsLast: ts,
      };
      candleState.set(token, state);
    } else {
      // we're in the same minute bucket -> update OHLC
      if (price > state.high) state.high = price;
      if (price < state.low) state.low = price;
      state.close = price;
      state.volume = volume; // overwrite with latest total volume
      state.tsLast = ts;
    }
  }
}
