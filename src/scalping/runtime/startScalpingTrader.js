// src/scalping/runtime/startScalpingTrader.js
import { APP_CONFIG } from "../../config/appConfig.js";
import { ensureKiteSession, validateKiteSession } from "../../data/kiteSession.js";
import { getZerodhaAuth } from "../../data/brokerToken.js";
import { getRecentCandles, watchScalpingSignals } from "../../data/mongoDataFeed.js";
import { getDb } from "../../data/mongoConnection.js";
import { ExecutionEngine } from "../../execution/ExecutionEngine.js";
import { PositionManager } from "../../positions/PositionManager.js";
import { RiskEngine } from "../../risk/RiskEngine.js";
import { ScalpingEngine } from "../../strategy/scalping/ScalpingEngine.js";
import { logger } from "../../utils/logger.js";

export async function startScalpingTrader() {
  logger.info("[scalping] booting scalping trader with Mongo-backed data feed");
  await getDb();

  const auth = await getZerodhaAuth({ forceRefresh: true });
  const hasSession = !!(auth.accessToken || auth.encToken);
  if (!hasSession) {
    logger.warn(
      "[scalping] No Zerodha auth found in Mongo; scalping trader will not place orders until a session token is stored."
    );
    return { disabled: true };
  }

  await ensureKiteSession({ forceRefresh: true });
  const validation = await validateKiteSession({ forceReload: true });
  if (!validation.ok) {
    throw new Error(`[scalping] unable to validate Kite session: ${validation.reason}`);
  }

  const positionManager = new PositionManager();
  await positionManager.syncFromDb();
  const scalpingEngine = new ScalpingEngine({ config: APP_CONFIG });
  const riskEngine = new RiskEngine({ config: APP_CONFIG });
  const executionEngine = new ExecutionEngine();

  await watchScalpingSignals({
    onSignal: async (signal) => {
      await handleSignal({ signal, scalpingEngine, riskEngine, executionEngine, positionManager });
    },
  });

  logger.info("[scalping] watching for scalping signals from MongoDB");
  return { positionManager, scalpingEngine, riskEngine, executionEngine };
}

async function handleSignal({ signal, scalpingEngine, riskEngine, executionEngine, positionManager }) {
  logger.info({ signalId: signal._id, symbol: signal.symbol }, "[scalping] processing signal");
  const candles = await getRecentCandles(signal.symbol, { limit: 50 });
  const decision = scalpingEngine.evaluate({ signal, candles });
  if (!decision) {
    await markSignal(signal, "REJECTED_STRATEGY");
    return;
  }

  const riskDecision = riskEngine.evaluate(decision, {
    openPositions: positionManager.getOpenPositions(),
    pnlSnapshot: positionManager.getPnlSnapshot(),
  });

  if (!riskDecision.allowed) {
    logger.warn({ reasonCodes: riskDecision.reasonCodes }, "[scalping] risk rejected trade");
    await markSignal(signal, "REJECTED_RISK");
    return;
  }

  const orderRequest = {
    symbol: decision.symbol,
    direction: decision.direction,
    quantity: riskDecision.quantity,
    orderType: "MARKET",
    product: "MIS",
    strategyId: "SCALPING_V1",
    entryPrice: decision.intendedEntry,
    stopLoss: decision.stopLoss,
    targetPrice: decision.target,
    meta: { reasonCodes: decision.reasonCodes, sourceSignalId: decision.meta?.sourceSignalId },
  };

  const result = await executionEngine.place(orderRequest);
  if (result.ok) {
    logger.info({ orderId: result.orderId }, "[scalping] order placed");
    await positionManager.recordOpenPosition({
      symbol: decision.symbol,
      direction: decision.direction,
      quantity: riskDecision.quantity,
      entryPrice: decision.intendedEntry,
      stopLoss: decision.stopLoss,
      target: decision.target,
      openedAt: new Date(),
      meta: decision.meta,
    });
    await markSignal(signal, "EXECUTED");
  } else {
    logger.error({ error: result.error }, "[scalping] failed to place order");
    await markSignal(signal, "EXECUTION_FAILED");
  }
}

async function markSignal(signal, status) {
  const db = await getDb();
  const col = db.collection(APP_CONFIG.collections.signals);
  await col.updateOne({ _id: signal._id }, { $set: { status, updatedAt: new Date() } });
}
