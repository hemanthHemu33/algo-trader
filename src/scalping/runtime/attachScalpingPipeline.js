// src/scalping/runtime/attachScalpingPipeline.js
import { SCALPING_CONFIG } from "../config/scalpingConfig.js";
import { ScalpEngine } from "../strategy/ScalpEngine.js";
import { createSignalPublisher } from "../transport/signalPublisher.js";
import { logger } from "../../utils/logger.js";

/**
 * Wire the scalping engine to a candle hub and transport.
 */
export function attachScalpingPipeline({
  candleHub,
  config = SCALPING_CONFIG,
  onSignal,
}) {
  if (!config.enabled) {
    logger.warn("[scalping] config disabled, pipeline not attached");
    return null;
  }

  const publisher = onSignal
    ? { publish: onSignal }
    : config.transport?.endpoint
      ? createSignalPublisher({
          endpoint: config.transport.endpoint,
          apiKey: config.transport.apiKey,
          dedupeWindowMs: config.transport.dedupeWindowMs,
          enabled: config.enabled,
        })
      : { publish: async () => ({ ok: false, reason: "no_transport" }) };

  const engine = new ScalpEngine({
    config,
    publishSignal: publisher.publish,
  });

  candleHub.onNewCandle((payload) => engine.onCandle(payload));
  logger.info(
    { universe: config.universe, maxCandles: config.maxCandles },
    "[scalping] ScalpEngine attached to candle stream"
  );

  return { engine, publisher };
}
