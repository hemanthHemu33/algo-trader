// src/positions/PositionManager.js
import { APP_CONFIG } from "../config/appConfig.js";
import { logger } from "../utils/logger.js";
import { getCollection } from "../data/mongoConnection.js";

export class PositionManager {
  constructor() {
    this.openPositions = [];
  }

  async syncFromDb() {
    const col = await getCollection(APP_CONFIG.collections.positions);
    this.openPositions = await col.find({}).toArray();
    return this.openPositions;
  }

  async recordOpenPosition(entry) {
    const col = await getCollection(APP_CONFIG.collections.positions);
    await col.insertOne(entry);
    this.openPositions.push(entry);
  }

  async closePosition(symbol, reason) {
    const col = await getCollection(APP_CONFIG.collections.positions);
    const tradeLogs = await getCollection(APP_CONFIG.collections.tradeLogs);
    const pos = await col.findOneAndDelete({ symbol });
    if (pos?.value) {
      await tradeLogs.insertOne({ ...pos.value, closedAt: new Date(), reason });
    }
  }

  getOpenPositions() {
    return this.openPositions;
  }

  getPnlSnapshot() {
    // TODO: compute from broker positions if available.
    const realized = 0;
    const unrealized = 0;
    return { realized, unrealized };
  }
}
