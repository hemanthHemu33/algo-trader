// src/broker/kiteStream.js
import { KiteTicker } from "kiteconnect";
import { logger } from "../utils/logger.js";
import { getZerodhaAuth } from "../data/brokerToken.js";
import { processTicks } from "../market/tickProcessor.js";
import { runStrategyOnNewCandle } from "../strategy/runner.js"; // we'll define next

let _ticker = null;

/**
 * startTickStream()
 *
 * @param {Object} params
 *  - tokens: number[] instrument tokens (e.g. [738561, 256265])
 *  - tokenToSymbol: { "738561": "NSE:RELIANCE", ... }
 *
 * After connect:
 *   - subscribes to tokens
 *   - sets mode to FULL (so we get last_price, volume, timestamp, depth, etc.)
 *   - on each batch of ticks: aggregate to candles
 */
export async function startTickStream({ tokens, tokenToSymbol }) {
  if (_ticker) {
    logger.warn("[kiteStream] already running");
    return _ticker;
  }

  const auth = await getZerodhaAuth();

  if (!auth.apiKey || !auth.accessToken) {
    logger.error(
      {
        hasApiKey: !!auth.apiKey,
        hasAccessToken: !!auth.accessToken,
      },
      "[kiteStream] missing Zerodha creds. Can't start live stream."
    );
    return null;
  }

  const ticker = new KiteTicker({
    api_key: auth.apiKey,
    access_token: auth.accessToken,
  });
  _ticker = ticker;

  // optional auto-reconnect so it survives blips. Zerodha supports this. :contentReference[oaicite:6]{index=6}
  ticker.autoReconnect(true, -1, 5);

  ticker.on("connect", () => {
    try {
      logger.info({ tokens }, "[kiteStream] connected, subscribing");
      ticker.subscribe(tokens);
    } catch (err) {
      logger.error({ err }, "[kiteStream] subscribe error");
    }

    // FULL mode = best data (LTP, volume, ohlc, depth, timestamp).
    // This is what we want for candle building and later maybe order book logic. :contentReference[oaicite:7]{index=7}
    try {
      ticker.setMode(ticker.modeFull, tokens);
    } catch (err) {
      logger.error({ err }, "[kiteStream] setMode error");
    }
  });

  ticker.on("ticks", (ticks) => {
    // 1) update rolling candles
    processTicks(ticks, tokenToSymbol, (symbol, candle) => {
      // 2) when a 1-min candle closes -> run strategy
      runStrategyOnNewCandle(symbol, candle);
    });
  });

  ticker.on("order_update", (order) => {
    // broker sends order status updates here in real-time. :contentReference[oaicite:8]{index=8}
    logger.info(
      { order },
      "[kiteStream] order_update (broker says order status changed)"
    );
    // Here you can sync your openPositions, realizedPnL, etc.
  });

  ticker.on("error", (err) => {
    logger.error({ err }, "[kiteStream] WS error");
  });

  ticker.on("disconnect", (err) => {
    logger.warn({ err }, "[kiteStream] disconnected");
  });

  ticker.on("close", (reason) => {
    logger.warn({ reason }, "[kiteStream] closed");
  });

  ticker.connect();

  logger.info("[kiteStream] connecting to Zerodha ticker WS...");
  return ticker;
}
