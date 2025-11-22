// src/scalping/main.js
import { startScalpingTrader } from "./runtime/startScalpingTrader.js";
import { logger } from "../utils/logger.js";

startScalpingTrader().catch((err) => {
  logger.error({ err }, "[scalping] failed to start trader");
  process.exit(1);
});
