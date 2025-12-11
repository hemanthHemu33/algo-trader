// src/data/mongoDataFeed.js
import { APP_CONFIG } from "../config/appConfig.js";
import { logger } from "../utils/logger.js";
import { getCollection } from "./mongoConnection.js";

export async function watchScalpingSignals({ onSignal }) {
  const signalsCol = await getCollection(APP_CONFIG.collections.signals);
  const pipeline = [
    {
      $match: {
        operationType: "insert",
        "fullDocument.strategyType": "SCALPING",
      },
    },
  ];

  const changeStream = signalsCol.watch(pipeline, {
    fullDocument: "updateLookup",
  });

  logger.info(
    { collection: APP_CONFIG.collections.signals },
    "[mongoDataFeed] watching scalping signals via change stream"
  );

  changeStream.on("change", async (event) => {
    const doc = event.fullDocument;
    if (!doc) return;
    if (typeof onSignal === "function") {
      try {
        await onSignal(doc);
      } catch (err) {
        logger.error({ err }, "[mongoDataFeed] error while handling signal");
      }
    }
  });

  changeStream.on("error", (err) => {
    logger.error({ err }, "[mongoDataFeed] change stream error");
  });

  return changeStream;
}

export async function getRecentCandles(symbol, { limit = 50, timeframe } = {}) {
  const collection = await getCollection(APP_CONFIG.collections.candles);
  const tf = timeframe || APP_CONFIG.scalping.timeframe;
  const cursor = collection
    .find({ symbol, timeframe: tf })
    .sort({ timestamp: -1 })
    .limit(limit);
  const docs = await cursor.toArray();
  return docs.reverse();
}

export async function getIndicatorSnapshot(symbol) {
  // Optional placeholder if scanner writes aggregated indicators.
  // TODO: wire to actual collection if available.
  return { symbol, indicators: null };
}
