// src/pipeline/runPipeline.js
import { buildFeatureFrame } from "../features/buildFeatureFrame.js";
import { detectLongSetup } from "../strategy/detectLongSetup.js";
import { scoreSetup } from "../strategy/scoreSetup.js";
import { evaluateTradeRisk } from "../risk/finalRiskCheck.js";
import { placeLongTrade } from "../execution/orderExecutor.js";
import { maybeExitPositions } from "../execution/exitManager.js";
import { logger } from "../utils/logger.js";

export function hookPipeline({ candleStore, pnlTracker, positionTracker }) {
  candleStore.onCandleClose(async ({ symbol, candle, candles }) => {
    // 1) Always check exits first (stoploss/target/force close per symbol)
    await maybeExitPositions({
      symbol,
      lastCandle: candle,
      positionTracker,
    });

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
    });

    // 7) Track position
    positionTracker.openNewPosition({
      symbol,
      qty,
      entry: tradeInfo.avgPrice ?? setup.entry,
      stopLoss: setup.stopLoss,
      target: setup.target,
      brokerOrderId: tradeInfo.brokerOrderId,
    });

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
