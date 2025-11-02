// src/bootstrap/startup.js
import { logger } from "../utils/logger.js";
import { connectDb } from "../data/db.js";
import { getZerodhaAuth } from "../data/brokerToken.js";
import { loadTodayUniverse } from "../universe/loadTodayUniverse.js";
import { loadInstrumentMapForUniverse } from "../data/instruments.js";
import { startTickStream } from "../broker/kiteStream.js";
import { initKiteREST } from "../exec/kiteREST.js";

export async function startup() {
  // 1) DB
  await connectDb(); // make sure db connection + indexes are up

  // 2) Broker auth (from tokens collection)
  const auth = await getZerodhaAuth();
  logger.info(
    {
      user: auth.userId,
      hasAccessToken: !!auth.accessToken,
      hasApiKey: !!auth.apiKey,
    },
    "[startup] zerodha auth ok"
  );

  // 3) Today's trade universe (top_stock_symbols)
  const universeSymbols = await loadTodayUniverse();
  logger.info({ universeSymbols }, "[startup] loaded today's trade universe");

  // 4) Instrument tokens for that universe
  const { symbolToToken, tokenToSymbol, tokens } =
    await loadInstrumentMapForUniverse(universeSymbols);

  // 5) Kick off live ticker stream (this starts pushing ticks -> candles -> strategy)
  await startTickStream({
    tokens,
    tokenToSymbol,
  });

  // 6) Init REST client for live order placement
  await initKiteREST();

  logger.info(
    {
      watchlistCount: universeSymbols.length,
      tokensCount: tokens.length,
    },
    "[startup] service initialized and live feed started"
  );

  // You can also return handles if main.js wants them
  return {
    universeSymbols,
    symbolToToken,
    tokenToSymbol,
    tokens,
  };
}
