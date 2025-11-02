// src/data/kiteStream.js
import { logger } from "../utils/logger.js";

/**
 * In final version, this will:
 *  - Open Zerodha WebSocket using apiKey + accessToken
 *  - Subscribe to instrument tokens for provided universe symbols
 *  - Build live 1m candles
 *  - On candle close:
 *      candleStore.addClosedCandle(symbol, candle)
 *      -> trigger strategy/risk/execution pipeline
 *
 * For now, we just stub it so startup() doesn't crash.
 */

export async function startTickStream({
  universe,
  candleStore,
  positionTracker,
  pnlTracker,
}) {
  logger.info(
    {
      universe,
      openPositions: positionTracker.getOpenPositions(),
      realizedPnL: pnlTracker.getRealizedPnL(),
    },
    "[kiteStream] (stub) tick stream not yet connected"
  );

  // IMPORTANT:
  // We are *not* starting any intervals or loops here yet.
  // Later we'll attach:
  //  - WebSocket client
  //  - candle assembly logic
  //  - onCandleClose() subscription to run strategy
}
