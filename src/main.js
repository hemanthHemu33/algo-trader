// src/main.js
import { startup } from "./bootstrap/startup.js";
import { startApiServer } from "./api/server.js";
import { setRuntimeState } from "./bootstrap/state.js";
import { logger } from "./utils/logger.js";

(async () => {
  logger.info("[main] starting trader-core bootstrap sequence");
  const runtime = await startup(); // build universe, trackers, streams
  setRuntimeState(runtime); // save it globally for controllers/executor

  startApiServer(); // REST API up (health, manual flat-all)

  logger.info("[main] trader-core is running. Waiting for market events...");
})();
