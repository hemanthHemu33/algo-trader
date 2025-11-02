import { startup } from "./bootstrap/startup.js";
import { startApiServer } from "./api/server.js";
import { logger } from "./utils/logger.js";

(async () => {
  try {
    const appState = await startup();
    await startApiServer(appState);

    logger.info("[main] trader-core is running. Waiting for market events...");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
