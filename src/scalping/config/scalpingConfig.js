// src/scalping/config/scalpingConfig.js
import { ENV } from "../../config/env.js";

export const SCALPING_CONFIG = {
  mode: ENV.TRADING_MODE,
  enabled: ENV.TRADING_MODE === "SCALPING",
  universe: ENV.SCALPING_INSTRUMENTS,
  maxCandles: 240,
  primaryTimeframe: "1m",
  useTicksForEntries: true,
  signalValidityMs: 60 * 1000,
  maxConcurrentPositions: 1,
  defaultQuantity: 25,
  strategyId: "SCALP_V1",
  indicators: {
    emaFastPeriod: 5,
    emaSlowPeriod: 9,
    vwapLookback: 20,
    volumeLookback: 30,
  },
  thresholds: {
    volumeSpikeFactor: 1.3,
    pullbackPct: 0.0015,
    rrMultiple: 1.6,
    minSlope: 0.02,
  },
  exits: {
    atrStopMultiplier: 1.1,
    timeStopMinutes: 8,
  },
  transport: {
    endpoint: `${ENV.SCALPING_EXECUTION_URL}/api/signals`,
    apiKey: ENV.SCALPING_SIGNAL_API_KEY,
    dedupeWindowMs: 15_000,
  },
};
