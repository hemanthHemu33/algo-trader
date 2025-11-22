// src/scalping/transport/signalPublisher.js
import axios from "axios";
import { logger } from "../../utils/logger.js";

export function createSignalPublisher({ endpoint, apiKey, dedupeWindowMs = 15000, enabled = true }) {
  if (!endpoint) {
    throw new Error("[SignalPublisher] endpoint is required");
  }

  const lastSent = new Map();

  async function publish(signal) {
    if (!enabled) {
      logger.warn({ signalId: signal?.signalId }, "[SignalPublisher] disabled, dropping signal");
      return { ok: false, reason: "disabled" };
    }

    if (!signal) return { ok: false, reason: "empty signal" };

    const key = `${signal.symbol}-${signal.side}`;
    const now = Date.now();
    const prev = lastSent.get(key);
    if (prev && now - prev < dedupeWindowMs) {
      return { ok: false, reason: "deduped" };
    }

    lastSent.set(key, now);

    try {
      const res = await axios.post(endpoint, signal, {
        headers: {
          "content-type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        timeout: 4000,
      });
      logger.info(
        { signalId: signal.signalId, symbol: signal.symbol },
        "[SignalPublisher] published"
      );
      return { ok: true, data: res.data };
    } catch (err) {
      logger.error(
        { err: err.message, signalId: signal.signalId },
        "[SignalPublisher] failed to publish"
      );
      return { ok: false, error: err.message };
    }
  }

  return { publish };
}
