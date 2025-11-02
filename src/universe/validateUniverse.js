import { FALLBACK_UNIVERSE } from "../config/fallbackUniverse.js";
import { logger } from "../utils/logger.js";

export function validateUniverse(universeList) {
  if (Array.isArray(universeList) && universeList.length > 0) {
    return universeList;
  }
  logger.warn(
    { fallback: FALLBACK_UNIVERSE },
    "[universe] using fallback universe"
  );
  return FALLBACK_UNIVERSE;
}
