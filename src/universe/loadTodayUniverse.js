import { getDb } from "../data/db.js";
import { logger } from "../utils/logger.js";

/**
 * loadTodayUniverse()
 *
 * We pull the latest preferred trading symbols from `top_stock_symbols`.
 * This collection (in your design) holds ONE doc that looks like:
 *
 * {
 *   _id: "2025-10-31:preopen",
 *   createdAtIST: "2025-10-31T10:08:38.807+05:30",
 *   symbols: ["NSE:UNIONBANK", "NSE:CANBK", ...]
 * }
 *
 * We'll:
 *  - read that doc
 *  - take its `symbols`
 *  - keep first ~5 for focused intraday trading
 *  - return []
 *    if not present (so startup can fallback to RELIANCE/TCS/etc.)
 */
export async function loadTodayUniverse() {
  const db = getDb();

  // just grab the single doc
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

  // de-dupe (just in case) & trim
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
