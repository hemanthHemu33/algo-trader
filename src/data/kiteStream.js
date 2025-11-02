// src/data/kiteStream.js
//
// This module wires live candles into the pipeline.
// Right now, we simulate candles so you can SEE trades fire immediately.
// Later, you replace the simulator with real Zerodha WebSocket ticks.

import { logger } from "../utils/logger.js";
import { handleNewClosedCandle } from "../pipeline/onNewCandle.js";

export async function startTickStream({
  universe,
  candleStore,
  positionTracker,
  pnlTracker,
  exitManager,
}) {
  // 1. Whenever a candle closes, run pipeline + exit logic.
  candleStore.onCandleClose(async ({ symbol, candle, series }) => {
    // track lastPrice on open positions
    positionTracker.updateOpenPosition(symbol, {
      lastPrice: candle.close,
    });

    // Strategy + risk → maybe open new trade
    await handleNewClosedCandle({
      symbol,
      candle,
      series,
      positionTracker,
      pnlTracker,
    });

    // After possibly opening/holding positions, enforce SL/Target exits.
    const lastPriceBySymbol = { [symbol]: candle.close };
    exitManager.checkStopsAndTargets(lastPriceBySymbol);
  });

  logger.info(
    {
      universe,
      openPositions: positionTracker.getOpenPositions(),
      realizedPnL: pnlTracker.getRealizedPnL(),
    },
    "[kiteStream] (stub) tick stream not yet connected to Zerodha"
  );

  // 2. DEV MODE: generate one "strong bullish" candle per symbol right now.
  // This immediately triggers the pipeline so you see trade logs.
  for (const sym of universe) {
    const base = 100 + Math.random() * 20;
    const high = base + Math.random() * 1.5;
    const low = base - Math.random() * 1.5;
    const close = low + (high - low) * 0.9; // close near high => bullish
    const candle = {
      ts: new Date(),
      open: base,
      high,
      low,
      close,
      volume: Math.floor(50000 + Math.random() * 100000),
    };

    candleStore.addClosedCandle(sym, candle);
  }
}
