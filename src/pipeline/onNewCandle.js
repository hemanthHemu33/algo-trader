// src/pipeline/onNewCandle.js
// This is the "brain": when a 1m candle closes, we run
// features -> strategy -> risk -> orderExecutor.

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
  // 1. compute indicators/features
  const features = buildFeatureFrame(series);

  // 2. ask strategy if we want to go long now
  const setup = detectLongSetup({ symbol, candle, features });
  if (!setup || !setup.wantsLong) {
    logger.debug({ symbol }, "[pipeline] no long setup / skipping");
    return;
  }

  // 3. score the setup
  const scored = scoreSetup(setup);

  // 4. risk validation + position sizing
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

  logger.info(
    { symbol, orderPlan: check.orderPlan },
    "[pipeline] APPROVED trade idea"
  );

  // 5. submit (currently DRY RUN only)
  await orderExecutor.placeEntryOrder(check.orderPlan);
}
