// src/strategy/runner.js
import { logger } from "../utils/logger.js";
import { ENV } from "../config/env.js";
import { placeMISMarketOrder } from "../exec/kiteREST.js";
// TODO: import your real feature calc and risk logic when ready:
// import { buildFeatures } from "./features.js";
// import { checkSetupBullish } from "./patterns.js";
// import { passesRisk } from "../risk/riskEngine.js";

/**
 * This is called for every finalized 1-min candle of every symbol.
 * candle = {
 *   minuteKey, open, high, low, close, volume, tsFirst, tsLast
 * }
 */

if (ENV.LIVE_TRADING_ENABLED === "true") {
  const resp = await placeMISMarketOrder(symbol, qty, "BUY");
  logger.info({ resp }, "[strategy] long entry placed");
} else {
  logger.info(
    { symbol, qty },
    "[strategy] would BUY here but LIVE_TRADING_ENABLED=false"
  );
}
export async function runStrategyOnNewCandle(symbol, candle) {
  // 1) compute indicators / pattern
  // const feat = buildFeatures(symbol, candle)
  // const setup = checkSetupBullish(feat)
  // const okRisk = passesRisk(symbol, feat, candle)

  // For now, just log the candle. No auto-order.
  logger.info(
    {
      symbol,
      minuteKey: candle.minuteKey,
      ohlc: {
        o: candle.open,
        h: candle.high,
        l: candle.low,
        c: candle.close,
      },
      volume: candle.volume,
    },
    "[strategy] new 1m candle closed"
  );

  // ---- THIS IS WHERE YOU DECIDE TO BUY/SELL ----
  // Example pseudo-logic (disabled by default):
  //
  // if (setup.isBullish && okRisk.canEnterLong) {
  //   const qty = okRisk.positionSizeQty; // e.g. based on MAX_RISK_PER_TRADE_RS/ATR
  //   const resp = await placeMISMarketOrder(symbol, qty, "BUY");
  //   logger.info({ resp }, "[strategy] long entry placed");
  // }
}
