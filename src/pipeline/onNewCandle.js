// src/pipeline/onNewCandle.js
import { buildFeatureFrame } from "../features/buildFeatureFrame.js";
import { detectLongSetup } from "../strategy/detectLongSetup.js";
import { scoreSetup } from "../strategy/scoreSetup.js";
import { finalRiskCheck } from "../risk/finalRiskCheck.js";
import { orderExecutor } from "../execution/orderExecutor.js";
import { logger } from "../utils/logger.js";

export async function handleNewClosedCandle({
  symbol,
  candle,
  series,
  positionTracker,
  pnlTracker,
}) {
  // 1. build features (EMA, ATR, etc.)
  const features = buildFeatureFrame(series);

  // 2. ask strategy if we WANT to long now
  const setup = detectLongSetup({ symbol, candle, features });
  if (!setup || !setup.wantsLong) {
    logger.debug({ symbol }, "[pipeline] no long setup / skip");
    return;
  }

  // 3. score it
  const scored = scoreSetup(setup);

  // 4. risk gating + sizing
  const check = finalRiskCheck({
    setup: scored,
    positionTracker,
    pnlTracker,
  });

  if (!check.ok) {
    logger.debug(
      { symbol, reason: check.reason },
      "[pipeline] trade rejected by risk"
    );
    return;
  }

  // 5. APPROVED TRADE
  logger.info(
    { symbol, orderPlan: check.orderPlan },
    "[pipeline] APPROVED trade idea"
  );

  // 6. send to executor (this will open position in memory;
  //    for now it's DRY RUN broker)
  await orderExecutor.placeEntryOrder(check.orderPlan);
}
