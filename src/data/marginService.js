// src/data/marginService.js
import { fetchAvailableEquityMargin } from "./kiteREST.js";
import { riskConfig } from "../config/riskConfig.js";
import { logger } from "../utils/logger.js";

const marginState = {
  consecutiveFailures: 0,
  circuitUntil: 0,
};

export async function getSpendableMargin() {
  const now = Date.now();
  if (marginState.circuitUntil && now < marginState.circuitUntil) {
    return {
      ok: false,
      reason: "margin_api_unavailable",
      retryAt: new Date(marginState.circuitUntil).toISOString(),
    };
  }

  try {
    const available = await fetchAvailableEquityMargin();
    if (!Number.isFinite(available)) {
      throw new Error("invalid_margin_response");
    }

    marginState.consecutiveFailures = 0;
    marginState.circuitUntil = 0;

    return { ok: true, available };
  } catch (err) {
    marginState.consecutiveFailures += 1;
    const willOpenCircuit =
      marginState.consecutiveFailures >= riskConfig.MARGIN_FAILURE_THRESHOLD;

    if (willOpenCircuit) {
      marginState.circuitUntil =
        Date.now() + riskConfig.MARGIN_CIRCUIT_COOLDOWN_MS;
    }

    logger.error(
      { err: err?.message, consecutiveFailures: marginState.consecutiveFailures },
      "[margin] failed to fetch available margin"
    );

    return {
      ok: false,
      reason: willOpenCircuit
        ? "margin_api_unavailable"
        : "margin_fetch_failed",
      retryAt: willOpenCircuit
        ? new Date(marginState.circuitUntil).toISOString()
        : undefined,
    };
  }
}
