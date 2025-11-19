// src/pipeline/runPipeline.js
import { buildFeatureFrame } from "../features/buildFeatureFrame.js";
import { detectLongSetup } from "../strategy/detectLongSetup.js";
import { scoreSetup } from "../strategy/scoreSetup.js";
import { evaluateTradeRisk } from "../risk/finalRiskCheck.js";
import { placeLongTrade } from "../execution/orderExecutor.js";
import { monitorProtectiveOrders } from "../execution/protectiveOrders.js";
import { logger } from "../utils/logger.js";

export function hookPipeline({
  candleStore,
  pnlTracker,
  positionTracker,
  exitManager,
}) {
  candleStore.onCandleClose(async ({ symbol, candle, candles }) => {
    // 1) Always check exits first (stoploss/target/force close per symbol)
    if (exitManager) {
      await exitManager.maybeExitPositions({
        symbol,
        lastCandle: candle,
      });
    }

    // 2) If we already have an open position in this symbol, don't open another
    if (positionTracker.getPosition(symbol)) {
      return;
    }

    // 3) Build features
    const frame = buildFeatureFrame(candles);
    if (!frame) return;

    // 4) Strategy
    const setup = detectLongSetup(symbol, frame);
    if (!setup) return;

    const confidenceScore = scoreSetup(setup);

    // 5) Risk, RR, margin sizing
    const riskEval = await evaluateTradeRisk({
      setup,
      pnlTracker,
      positionTracker,
    });

    if (!riskEval.ok) {
      logger.debug(
        { symbol, reason: riskEval.reason },
        "[pipeline] trade blocked"
      );
      return;
    }

    const qty = riskEval.qty;
    if (qty <= 0) return;

    // 6) Send live order
    const tradeInfo = await placeLongTrade({
      symbol,
      qty,
      entry: setup.entry,
      stopLoss: setup.stopLoss,
      target: setup.target,
      positionTracker,
    });

    if (tradeInfo.status !== "FILLED") {
      logger.warn({ symbol }, "[pipeline] entry did not fill, skipping track");
      return;
    }

    // 7) Track position
    positionTracker.openNewPosition({
      symbol,
      qty: tradeInfo.filledQty ?? qty,
      entry: tradeInfo.avgPrice ?? setup.entry,
      stopLoss: setup.stopLoss,
      target: setup.target,
      brokerOrderId: tradeInfo.brokerOrderId,
      protectiveOrders: tradeInfo.protectiveOrders,
    });

    monitorProtectiveOrders({
      symbol,
      protectiveOrders: tradeInfo.protectiveOrders,
      positionTracker,
    }).catch((err) =>
      logger.error({ err: err.message }, "[pipeline] protective watcher failed")
    );

    logger.info(
      {
        symbol,
        qty,
        entry: setup.entry,
        stopLoss: setup.stopLoss,
        target: setup.target,
        rr: (setup.target - setup.entry) / (setup.entry - setup.stopLoss),
        confidenceScore,
      },
      "[pipeline] OPEN LONG"
    );
  });
}
