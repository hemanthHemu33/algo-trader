// src/universe/loadTodayUniverse.js
import { getDb } from "../data/db.js";
import { logger } from "../utils/logger.js";

/**
 * Load today's trading universe.
 * We read the single most recent doc from `top_stock_symbols`
 * which looks like:
 * {
 *   _id: "2025-10-31:preopen",
 *   createdAtIST: "...",
 *   symbols: ["NSE:UNIONBANK", "NSE:CANBK", ...]
 * }
 */
export async function loadTodayUniverse() {
  const db = getDb();

  // In your DB design you basically keep ONE doc.
  // We'll just grab any doc (or latest if there are many).
  const latest = await db.collection("top_stock_symbols").findOne({});

  if (!latest) {
    logger.warn("[universe] no top_stock_symbols doc found, will fallback");
    return [];
  }

  const rawSymbols = Array.isArray(latest.symbols) ? latest.symbols : [];

  if (rawSymbols.length === 0) {
    logger.warn(
      { latestId: latest._id },
      "[universe] top_stock_symbols doc has no symbols[], will fallback"
    );
    return [];
  }

  // de-dupe preserve order
  const uniqueSymbols = [...new Set(rawSymbols)];
  const universeSymbols = uniqueSymbols;

  logger.info(
    {
      pickId: latest._id,
      universeSymbols,
    },
    "[universe] loaded top_stock_symbols for trading universe"
  );

  return universeSymbols;
}
