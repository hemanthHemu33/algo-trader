// src/data/kiteStream.js
import { logger } from "../utils/logger.js";
import { handleNewClosedCandle } from "../pipeline/onNewCandle.js";

/**
 * startTickStream()
 *
 * Eventually:
 *  - connect Zerodha WebSocket using apiKey + accessToken
 *  - subscribe to tokens for all symbols in `universe`
 *  - build live 1m candles
 *  - every time a 1m candle CLOSES:
 *        candleStore.addClosedCandle(symbol, candle)
 *
 * For now:
 *  - we only wire up the candleStore.onCandleClose() → pipeline
 *  - we log current universe / PnL so startup() can show status
 */
export async function startTickStream({
  universe,
  candleStore,
  positionTracker,
  pnlTracker,
}) {
  // whenever candleStore finalizes a candle, run the pipeline
  candleStore.onCandleClose(async ({ symbol, candle, series }) => {
    await handleNewClosedCandle({
      symbol,
      candle,
      series,
      positionTracker,
      pnlTracker,
    });
  });

  logger.info(
    {
      universe,
      openPositions: positionTracker.getOpenPositions(),
      realizedPnL: pnlTracker.getRealizedPnL(),
    },
    "[kiteStream] (stub) tick stream not yet connected"
  );

  // NOTE: we are NOT starting any timers / websockets yet.
  // safe for offline dev.
}
