// src/risk/RiskEngine.js
import { withinTimeWindow } from "../utils/timeWindow.js";

export class RiskEngine {
  constructor({ config }) {
    this.config = config;
  }

  evaluate(decision, { openPositions = [], pnlSnapshot = { realized: 0, unrealized: 0 } }) {
    if (!decision) return { allowed: false, reasonCodes: ["no_decision"] };

    const now = new Date();
    if (!withinTimeWindow(now, this.config.scalping.allowedStartTime, this.config.scalping.allowedEndTime)) {
      return { allowed: false, reasonCodes: ["outside_trading_window"] };
    }

    const totalLossPct = this.computeLossPct(pnlSnapshot);
    if (totalLossPct <= -this.config.scalping.maxDailyLossPct) {
      return { allowed: false, reasonCodes: ["max_daily_loss_exceeded"] };
    }

    if (openPositions.length >= this.config.scalping.maxOpenPositions) {
      return { allowed: false, reasonCodes: ["max_open_positions"] };
    }

    const quantity = this.computePositionSize(decision);
    if (!quantity || quantity < this.config.scalping.minLotSize) {
      return { allowed: false, reasonCodes: ["position_too_small"] };
    }

    return { allowed: true, quantity, reasonCodes: ["risk_ok"] };
  }

  computeLossPct({ realized = 0, unrealized = 0 }) {
    const totalCapital = this.config.scalping.capital;
    if (!totalCapital) return 0;
    const pnl = realized + unrealized;
    return (pnl / totalCapital) * 100;
  }

  computePositionSize(decision) {
    const riskPerShare = Math.abs(decision.intendedEntry - decision.stopLoss);
    if (!riskPerShare || riskPerShare <= 0) return 0;

    const capital = this.config.scalping.capital;
    const maxRiskPct = this.config.scalping.maxRiskPerTradePct;
    const riskCapital = (capital * maxRiskPct) / 100;
    const qty = Math.floor(riskCapital / riskPerShare);
    return Math.min(qty, this.config.scalping.maxOrderQty);
  }
}
