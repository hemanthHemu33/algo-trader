// src/data/instruments.js
import { getDb } from "./db.js";
import { logger } from "../utils/logger.js";

/**
 * Load instrument tokens for today's trading universe.
 * Expects Mongo collection "instrument_tokens" shaped like:
 * { symbol: "NSE:CANBK", token: 12345 }
 *
 * Returns:
 * {
 *    symbolToToken: { "NSE:CANBK": 12345, "NSE:UNIONBANK": 7777, ... },
 *    tokenToSymbol: { "12345": "NSE:CANBK", "7777": "NSE:UNIONBANK", ... },
 *    tokens: [12345, 7777, ...]
 * }
 *
 * If any symbol in universe is missing, we warn (so you can go fill DB).
 */
export async function loadInstrumentMapForUniverse(universeSymbols) {
  const db = getDb();

  const rows = await db
    .collection("instrument_tokens")
    .find({ symbol: { $in: universeSymbols } })
    .toArray();

  const symbolToToken = {};
  const tokenToSymbol = {};

  for (const row of rows) {
    if (!row || !row.symbol || !row.token) continue;
    symbolToToken[row.symbol] = row.token;
    tokenToSymbol[String(row.token)] = row.symbol;
  }

  // Sanity check / debug
  const missing = universeSymbols.filter((sym) => !symbolToToken[sym]);
  if (missing.length > 0) {
    logger.warn(
      { missing },
      "[instruments] missing instrument tokens for some symbols"
    );
  }

  const tokens = Object.values(symbolToToken);

  logger.info(
    {
      universeSymbols,
      tokens,
    },
    "[instruments] loaded instrument token map"
  );

  return { symbolToToken, tokenToSymbol, tokens };
}
