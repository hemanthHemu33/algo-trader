// src/data/tokenMap.js
import { getDb } from "./db.js";
import { logger } from "../utils/logger.js";

/**
 * parse "NSE:TCS" -> { exchange:"NSE", tradingsymbol:"TCS" }
 */
function parseExchangeSymbol(exchangeSymbol) {
  if (!exchangeSymbol) return { exchange: "NSE", tradingsymbol: "" };
  const parts = String(exchangeSymbol).split(":");
  if (parts.length === 1) return { exchange: "NSE", tradingsymbol: parts[0] };
  return { exchange: parts[0], tradingsymbol: parts[1] };
}

/**
 * load rows from your `instruments` collection.
 * Expected doc example you gave:
 * {
 *   instrument_token: "256265",
 *   exchange_token: "1001",
 *   tradingsymbol: "RELIANCE",
 *   instrument_type: "EQ",
 *   segment: "NSE",
 *   exchange: "NSE",
 *   ...
 * }
 *
 * We do an exact match on { exchange, tradingsymbol }.
 * If nothing is found and an alias map is provided, we retry with alias.
 */
export async function buildTokenMaps(universe, aliasMap = {}) {
  const db = getDb();

  // Parse all requested pairs
  const pairs = universe.map((s) => parseExchangeSymbol(s));

  // Prepare a $or query for exact matches
  const ors = pairs.map((p) => ({
    exchange: p.exchange,
    tradingsymbol: p.tradingsymbol,
  }));

  // Pull ONLY what we need
  const rows = await db
    .collection("instruments")
    .find({ $or: ors })
    .project({
      instrument_token: 1,
      tradingsymbol: 1,
      exchange: 1,
      instrument_type: 1,
      segment: 1,
      name: 1,
    })
    .toArray();

  // Build a quick lookup
  const exactIdx = new Map(
    rows.map((r) => [`${r.exchange}:${r.tradingsymbol}`, r])
  );

  const symbolToToken = {};
  const tokenToSymbol = {};
  const missing = [];

  for (const p of pairs) {
    const key = `${p.exchange}:${p.tradingsymbol}`;
    let row = exactIdx.get(key);

    // If not found, try alias (optional)
    if (!row && aliasMap[key]) {
      const aliasKey = aliasMap[key]; // e.g. "NSE:MCDOWELL-N"
      row =
        exactIdx.get(aliasKey) ||
        (await db.collection("instruments").findOne(
          {
            exchange: aliasKey.split(":")[0],
            tradingsymbol: aliasKey.split(":")[1],
          },
          { projection: { instrument_token: 1, tradingsymbol: 1, exchange: 1 } }
        ));
    }

    if (!row) {
      // Final fallback: try a strict exact lookup now (case issues)
      row = await db.collection("instruments").findOne(
        {
          exchange: p.exchange,
          tradingsymbol: p.tradingsymbol,
        },
        { projection: { instrument_token: 1, tradingsymbol: 1, exchange: 1 } }
      );
    }

    if (!row) {
      missing.push(key);
      continue;
    }

    const tokenNum = Number(row.instrument_token);
    if (!Number.isFinite(tokenNum)) {
      missing.push(key);
      continue;
    }

    symbolToToken[key] = tokenNum;
    tokenToSymbol[String(tokenNum)] = key;
  }

  const tokens = Object.values(symbolToToken);

  if (missing.length) {
    logger.warn(
      { missing },
      "[tokenMap] missing instrument tokens for universe"
    );
  } else {
    logger.info(
      { count: tokens.length },
      "[tokenMap] all instruments resolved"
    );
  }

  // Helpful indexes (run once in Mongo shell):
  // db.instruments.createIndex({ exchange: 1, tradingsymbol: 1 });
  // db.instruments.createIndex({ instrument_token: 1 });

  return { symbolToToken, tokenToSymbol, tokens, missing };
}
