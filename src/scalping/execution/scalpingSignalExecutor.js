// src/scalping/execution/scalpingSignalExecutor.js
import { evaluateTradeRisk } from "../../risk/finalRiskCheck.js";
import { monitorProtectiveOrders } from "../../execution/protectiveOrders.js";
import { placeLongTrade, placeShortTrade } from "../../execution/orderExecutor.js";
import { logger } from "../../utils/logger.js";

/**
 * Handles normalized scalping signals by running risk checks and executing
 * orders immediately. This bypasses the REST publisher path and turns the
 * scanner into a live algo.
 */
export function createScalpingSignalExecutor({
  positionTracker,
  pnlTracker,
  config,
}) {
  const seenSignals = new Set();

  async function handle(signal) {
    if (!signal) return;
    if (seenSignals.has(signal.signalId)) return;
    seenSignals.add(signal.signalId);

    const now = Date.now();
    if (signal.timeValidTill && now > signal.timeValidTill) {
      logger.debug({ signalId: signal.signalId }, "[scalping] signal expired");
      return;
    }

    if (
      positionTracker.getOpenPositions().length >=
      (config.maxConcurrentPositions ?? 1)
    ) {
      logger.info({ symbol: signal.symbol }, "[scalping] concurrency cap hit");
      return;
    }

    const setup = {
      symbol: signal.symbol,
      entry: signal.entryPriceHint,
      stopLoss: signal.stopLoss,
      target: signal.target,
    };

    const riskEval = await evaluateTradeRisk({
      setup,
      pnlTracker,
      positionTracker,
    });

    if (!riskEval.ok) {
      logger.debug(
        { symbol: signal.symbol, reason: riskEval.reason },
        "[scalping] blocked by risk"
      );
      return;
    }

    const proposedQty = signal.quantity ?? riskEval.qty ?? 0;
    const qty = riskEval.qty
      ? Math.min(riskEval.qty, proposedQty || riskEval.qty)
      : proposedQty;

    if (!qty || qty <= 0) {
      logger.debug({ symbol: signal.symbol }, "[scalping] zero qty after sizing");
      return;
    }

    const side = signal.side === "SELL" ? "SHORT" : "LONG";
    const executor = side === "SHORT" ? placeShortTrade : placeLongTrade;

    const tradeInfo = await executor({
      symbol: signal.symbol,
      qty,
      entry: setup.entry,
      stopLoss: setup.stopLoss,
      target: setup.target,
    });

    if (tradeInfo.status !== "FILLED") {
      logger.warn(
        { symbol: signal.symbol, status: tradeInfo.status },
        "[scalping] entry did not fill"
      );
      return;
    }

    positionTracker.openNewPosition({
      symbol: signal.symbol,
      qty: tradeInfo.filledQty ?? qty,
      entry: tradeInfo.avgPrice ?? setup.entry,
      stopLoss: setup.stopLoss,
      target: setup.target,
      brokerOrderId: tradeInfo.brokerOrderId,
      protectiveOrders: tradeInfo.protectiveOrders,
      side,
    });

    monitorProtectiveOrders({
      symbol: signal.symbol,
      protectiveOrders: tradeInfo.protectiveOrders,
      positionTracker,
    }).catch((err) =>
      logger.error({ err: err.message }, "[scalping] protective watcher failed")
    );

    logger.info(
      {
        symbol: signal.symbol,
        side,
        qty,
        entry: setup.entry,
        stopLoss: setup.stopLoss,
        target: setup.target,
        rr:
          Math.abs(setup.target - setup.entry) /
          Math.max(Math.abs(setup.entry - setup.stopLoss), 1e-6),
      },
      "[scalping] OPEN position"
    );
  }

  return { handle };
}
