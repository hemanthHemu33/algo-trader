// tests/scalpingPipelineHarness.js
// Quick harness to simulate a scalping signal through strategy and risk engines.
import { APP_CONFIG } from "../src/config/appConfig.js";
import { ScalpingEngine } from "../src/strategy/scalping/ScalpingEngine.js";
import { RiskEngine } from "../src/risk/RiskEngine.js";

const sampleSignal = {
  symbol: "NSE:DEMO",
  strategyType: "SCALPING",
  createdAt: new Date(),
};

const sampleCandles = Array.from({ length: 30 }).map((_, idx) => ({
  timestamp: new Date(Date.now() - (30 - idx) * 60 * 1000),
  open: 100 + idx * 0.2,
  high: 100.5 + idx * 0.2,
  low: 99.5 + idx * 0.2,
  close: 100.3 + idx * 0.2,
  volume: 300000 + idx * 10000,
}));

const scalpingEngine = new ScalpingEngine({ config: APP_CONFIG });
const decision = scalpingEngine.evaluate({ signal: sampleSignal, candles: sampleCandles });
console.log("strategy decision", decision);

const riskEngine = new RiskEngine({ config: APP_CONFIG });
const risk = riskEngine.evaluate(decision, { openPositions: [], pnlSnapshot: { realized: 0, unrealized: 0 } });
console.log("risk decision", risk);
