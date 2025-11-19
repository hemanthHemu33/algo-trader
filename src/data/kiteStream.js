// src/data/kiteStream.js
import { KiteTicker } from "kiteconnect";
import { ensureKiteSession } from "./kiteSession.js";
import { buildTokenMaps } from "./tokenMap.js";
import { nowIST } from "../utils/istTime.js";
import { logger } from "../utils/logger.js";

export async function startTickStream({
  universe,
  candleStore,
  positionTracker,
  pnlTracker,
}) {
  const auth = await ensureKiteSession();
  if (!auth.apiKey || !auth.accessToken) {
    logger.error("[kiteStream] no apiKey/accessToken -> can't start live feed");
    return;
  }

  // Build symbol <-> token maps from DB
  const { symbolToToken, tokenToSymbol } = await buildTokenMaps(universe);
  const tokens = Object.values(symbolToToken)
    .map((t) => Number(t))
    .filter(Boolean);

  if (!tokens.length) {
    logger.error(
      { universe },
      "[kiteStream] no instrument tokens to subscribe"
    );
    return;
  }

  const ticker = new KiteTicker({
    api_key: auth.apiKey,
    access_token: auth.accessToken,
  });

  // Per-token rolling candle bucket
  // buckets[token] = {
  //   minuteKey: <epoch ms aligned to minute>,
  //   open, high, low, close,
  //   lastVolume, volumeDelta
  // }
  const buckets = {};

  function finalizeBucket(token) {
    const b = buckets[token];
    if (!b) return;
    const symbol = tokenToSymbol[token];
    if (!symbol) return;

    candleStore.addClosedCandle(symbol, {
      ts: new Date(b.minuteKey),
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volumeDelta,
    });
  }

  ticker.on("ticks", (ticks) => {
    const now = nowIST();

    for (const t of ticks) {
      const token = t.instrument_token;
      const symbol = tokenToSymbol[token];
      if (!symbol) continue;

      const ltp = t.last_price; // last traded price
      const totalVol = t.volume || 0; // Zerodha tick has total traded volume so far today. :contentReference[oaicite:7]{index=7}

      // minuteKey = this minute rounded down
      const minute = new Date(now);
      minute.setSeconds(0, 0);
      const minuteKey = minute.getTime();

      let b = buckets[token];

      // minute changed? flush previous candle
      if (!b || b.minuteKey !== minuteKey) {
        if (b) {
          finalizeBucket(token);
        }
        b = {
          minuteKey,
          open: ltp,
          high: ltp,
          low: ltp,
          close: ltp,
          lastVolume: totalVol,
          volumeDelta: 0,
        };
        buckets[token] = b;
      }

      // update ongoing bucket
      b.close = ltp;
      if (ltp > b.high) b.high = ltp;
      if (ltp < b.low) b.low = ltp;

      // volumeDelta = today's cumulative volume diff
      if (totalVol > b.lastVolume) {
        b.volumeDelta += totalVol - b.lastVolume;
      }
      b.lastVolume = totalVol;
    }
  });

  ticker.on("connect", () => {
    logger.info({ tokens }, "[kiteStream] connected. subscribing tokens");
    ticker.subscribe(tokens);
    ticker.setMode(ticker.modeFull, tokens); // full mode gives volume, ohlc etc. :contentReference[oaicite:8]{index=8}
  });

  ticker.on("error", (err) => {
    logger.error(err, "[kiteStream] error");
  });

  ticker.on("close", (reason) => {
    logger.warn({ reason }, "[kiteStream] closed");
  });

  ticker.connect();

  logger.info(
    {
      universe,
      openPositions: positionTracker.getOpenPositions(),
      realizedPnL: pnlTracker.getRealizedPnL(),
    },
    "[kiteStream] live tick stream started"
  );
}
