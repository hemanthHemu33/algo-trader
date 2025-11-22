// src/scalping/strategy/ScalpEngine.js
import { randomUUID } from "crypto";
import {
  candleRange,
  computeEma,
  computeSlope,
  computeVolumeProfile,
  computeVwap,
} from "../indicators/fastIndicators.js";
import { logger } from "../../utils/logger.js";

function avgRange(candles, lookback = 10) {
  if (!candles || candles.length < lookback) return null;
  const slice = candles.slice(-lookback);
  const ranges = slice.map((c) => candleRange(c));
  return ranges.reduce((a, b) => a + b, 0) / ranges.length;
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

export class ScalpEngine {
  constructor({ config, publishSignal }) {
    this.config = config;
    this.publishSignal = publishSignal;
  }

  /**
   * Consume a closed 1-minute candle and emit a normalized scalping signal.
   */
  async onCandle({ symbol, candle, candles }) {
    if (!this.config?.enabled || this.config.mode !== "SCALPING") return;
    if (!candles || candles.length < 15) return; // need minimum history

    const ctx = this.buildContext(candles);
    if (!ctx) return;

    const signal = this.buildSignal({ symbol, candle, ctx });
    if (!signal) return;

    if (this.publishSignal) {
      await this.publishSignal(signal);
    } else {
      logger.info({ signal }, "[ScalpEngine] signal ready (no publisher attached)");
    }
  }

  buildContext(candles) {
    const { indicators, thresholds, exits } = this.config;
    const closes = candles.map((c) => c.close);
    const emaFast = computeEma(
      closes.slice(-(indicators.emaFastPeriod * 3)),
      indicators.emaFastPeriod
    );
    const emaSlow = computeEma(
      closes.slice(-(indicators.emaSlowPeriod * 3)),
      indicators.emaSlowPeriod
    );
    const vwap = computeVwap(candles, indicators.vwapLookback);
    const volumeProfile = computeVolumeProfile(
      candles,
      indicators.volumeLookback
    );
    const emaSlope = computeSlope(closes, 3);
    const range10 = avgRange(candles, 10);

    if (!emaFast || !emaSlow || !vwap || !range10) return null;

    return {
      emaFast,
      emaSlow,
      vwap,
      volumeProfile,
      emaSlope,
      range10,
      thresholds,
      exits,
    };
  }

  buildSignal({ symbol, candle, ctx }) {
    const { thresholds } = ctx;
    const price = candle.close;
    const bullishTrend =
      price > ctx.vwap && ctx.emaFast > ctx.emaSlow && ctx.emaSlope > 0;
    const bearishTrend =
      price < ctx.vwap && ctx.emaFast < ctx.emaSlow && ctx.emaSlope < 0;

    const pullbackBuy = bullishTrend && candle.low <= ctx.vwap * (1 + thresholds.pullbackPct);
    const pullbackSell =
      bearishTrend && candle.high >= ctx.vwap * (1 - thresholds.pullbackPct);

    const volumeSpike =
      ctx.volumeProfile.avg &&
      ctx.volumeProfile.last > ctx.volumeProfile.avg * thresholds.volumeSpikeFactor;

    if (!(pullbackBuy || pullbackSell) || !volumeSpike) {
      return null; // avoid noisy signals
    }

    const direction = pullbackBuy ? "BUY" : "SELL";
    const riskBuffer = ctx.range10 * ctx.exits.atrStopMultiplier;
    const entry = price;

    let stopLoss;
    if (direction === "BUY") {
      stopLoss = Math.min(candle.low, entry - riskBuffer);
    } else {
      stopLoss = Math.max(candle.high, entry + riskBuffer);
    }

    const risk = Math.abs(entry - stopLoss);
    if (risk <= 0) return null;

    const target =
      direction === "BUY"
        ? entry + risk * thresholds.rrMultiple
        : entry - risk * thresholds.rrMultiple;

    const confidenceBase = 0.55;
    const confidence = clamp(
      confidenceBase + Math.abs(ctx.emaSlope) + (volumeSpike ? 0.1 : 0),
      0,
      0.98
    );

    const signalId = randomUUID();
    const now = new Date();

    return {
      signalId,
      symbol,
      side: direction,
      entryType: "MARKET",
      entryPriceHint: entry,
      stopLoss,
      target,
      quantity: this.config.defaultQuantity,
      strategyId: this.config.strategyId,
      confidence,
      timeValidTill: now.getTime() + this.config.signalValidityMs,
      createdAt: now.toISOString(),
      metadata: {
        emaFast: ctx.emaFast,
        emaSlow: ctx.emaSlow,
        vwap: ctx.vwap,
        volumeAvg: ctx.volumeProfile.avg,
        volumeLast: ctx.volumeProfile.last,
      },
    };
  }
}
