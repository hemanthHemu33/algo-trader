// src/strategy/scalping/ScalpingEngine.js
import { candleRange, computeEma, computeSlope, computeVwap } from "../../scalping/indicators/fastIndicators.js";
import { logger } from "../../utils/logger.js";

function computeAtr(candles, period = 14) {
  if (!candles || candles.length < period + 1) return null;
  const slice = candles.slice(-period - 1);
  const trs = [];
  for (let i = 1; i < slice.length; i++) {
    const prevClose = slice[i - 1].close;
    const high = slice[i].high;
    const low = slice[i].low;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }
  const sum = trs.reduce((a, b) => a + b, 0);
  return sum / trs.length;
}

export class ScalpingEngine {
  constructor({ config }) {
    this.config = config;
  }

  evaluate({ signal, candles }) {
    if (!signal || !candles?.length) return null;
    if (candles.length < 10) {
      logger.debug({ symbol: signal.symbol }, "[ScalpingEngine] insufficient candles");
      return null;
    }

    const recentClose = candles[candles.length - 1].close;
    const closes = candles.map((c) => c.close);
    const vwap = computeVwap(candles);
    const emaFast = computeEma(closes, 5);
    const emaSlow = computeEma(closes, 9);
    const emaSlope = computeSlope(closes, 3);
    const atr = computeAtr(candles, 14);
    const avgRange = candleRange(candles[candles.length - 1]);

    const volume = candles[candles.length - 1].volume || 0;
    const volAvg =
      candles.slice(-20).reduce((acc, c) => acc + (c.volume || 0), 0) /
      Math.max(1, Math.min(20, candles.length));

    const longBias =
      recentClose > vwap * (1 + this.config.scalping.vwapBufferPct) &&
      emaFast > emaSlow &&
      emaSlope > 0;
    const shortBias =
      recentClose < vwap * (1 - this.config.scalping.vwapBufferPct) &&
      emaFast < emaSlow &&
      emaSlope < 0;

    const volatilityOk = atr && atr >= this.config.scalping.atrThreshold;
    const volumeOk = volume >= this.config.scalping.minVolume || volume > volAvg;

    if (!(volatilityOk && volumeOk && (longBias || shortBias))) {
      logger.info(
        { symbol: signal.symbol },
        "[ScalpingEngine] rejecting signal due to filters"
      );
      return null;
    }

    const direction = longBias ? "BUY" : "SELL";
    const intendedEntry = recentClose;
    const stopLossDistance = Math.max(
      Math.abs(avgRange) || 0,
      intendedEntry * this.config.scalping.stopBufferPct
    );
    const stopLoss =
      direction === "BUY" ? intendedEntry - stopLossDistance : intendedEntry + stopLossDistance;
    const risk = Math.abs(intendedEntry - stopLoss);
    const target =
      direction === "BUY"
        ? intendedEntry + risk * this.config.scalping.rrMultiple
        : intendedEntry - risk * this.config.scalping.rrMultiple;

    const confidence = Math.min(
      0.99,
      this.config.scalping.minConfidence + Math.abs(emaSlope) + (volumeOk ? 0.1 : 0)
    );

    return {
      symbol: signal.symbol,
      direction,
      intendedEntry,
      stopLoss,
      target,
      riskReward: this.config.scalping.rrMultiple,
      confidence,
      reasonCodes: buildReasons({ longBias, shortBias, volatilityOk, volumeOk }),
      meta: {
        sourceSignalId: signal._id?.toString?.() || signal.signalId,
        vwap,
        emaFast,
        emaSlow,
        emaSlope,
        atr,
        volume,
        volumeAvg: volAvg,
      },
    };
  }
}

function buildReasons(flags) {
  const reasons = [];
  if (flags.longBias) reasons.push("vwap_breakout_long");
  if (flags.shortBias) reasons.push("vwap_breakdown_short");
  if (flags.volatilityOk) reasons.push("atr_ok");
  if (flags.volumeOk) reasons.push("volume_ok");
  return reasons;
}
