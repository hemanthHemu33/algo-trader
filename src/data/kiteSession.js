// src/data/kiteSession.js
import axios from "axios";
import { KiteConnect } from "kiteconnect";
import { ENV } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { getZerodhaAuth, saveZerodhaAuth } from "./brokerToken.js";

let _health = {
  ok: false,
  checkedAt: null,
  method: null,
  reason: "not_checked",
};

function updateHealth(update) {
  _health = {
    ..._health,
    ...update,
    checkedAt: new Date(),
  };
}

export function getAuthHealth() {
  return _health;
}

function isTokenExpired(err) {
  const message = err?.message || "";
  const status = err?.status || err?.response?.status;
  if (status === 401 || status === 403) return true;
  if (err?.error_type === "TokenException") return true;
  return /token is invalid|expired|TokenException/i.test(message);
}

async function validateWithAccessToken(auth) {
  if (!auth.apiKey || !auth.accessToken) return null;
  const kc = new KiteConnect({ api_key: auth.apiKey });
  kc.setAccessToken(auth.accessToken);
  const profile = await kc.getProfile();
  return profile;
}

async function validateWithEnctoken(auth) {
  if (!auth.encToken) return null;
  const res = await axios.get("https://kite.zerodha.com/oms/user/profile", {
    headers: {
      Cookie: `enctoken=${auth.encToken}`,
    },
  });
  return res?.data?.data || null;
}

export async function validateKiteSession({ forceReload = false } = {}) {
  const auth = await getZerodhaAuth({ forceRefresh: forceReload });
  if (!auth.apiKey || (!auth.accessToken && !auth.encToken)) {
    updateHealth({ ok: false, reason: "missing_credentials" });
    return { ok: false, reason: "missing_credentials", auth };
  }

  try {
    const profile = await validateWithAccessToken(auth);
    if (profile) {
      updateHealth({ ok: true, method: "access_token", profile });
      return { ok: true, profile, auth };
    }
  } catch (err) {
    const expired = isTokenExpired(err);
    updateHealth({ ok: false, reason: err.message, expired });
    return { ok: false, reason: err.message, expired, auth };
  }

  try {
    const profile = await validateWithEnctoken(auth);
    if (profile) {
      updateHealth({ ok: true, method: "enctoken", profile });
      return { ok: true, profile, auth };
    }
  } catch (err) {
    const expired = isTokenExpired(err);
    updateHealth({ ok: false, reason: err.message, expired });
    return { ok: false, reason: err.message, expired, auth };
  }

  updateHealth({ ok: false, reason: "validation_failed" });
  return { ok: false, reason: "validation_failed", auth };
}

async function refreshWithRefreshToken(auth) {
  if (!auth.refreshToken || !ENV.ZERODHA_API_SECRET || !auth.apiKey) return null;

  const kc = new KiteConnect({ api_key: auth.apiKey });
  const session = await kc.renewAccessToken(auth.refreshToken, ENV.ZERODHA_API_SECRET);
  return session;
}

async function refreshWithEnctoken(auth) {
  if (!auth.encToken) return null;

  const res = await axios.post(
    "https://kite.zerodha.com/oms/user/session/refresh_token",
    null,
    {
      headers: {
        Cookie: `enctoken=${auth.encToken}`,
      },
    }
  );

  return res?.data?.data || null;
}

export async function refreshKiteSession() {
  const auth = await getZerodhaAuth();
  let lastError = null;

  try {
    const refreshed = await refreshWithRefreshToken(auth);
    if (refreshed) {
      const saved = await saveZerodhaAuth({ ...refreshed, encToken: auth.encToken });
      updateHealth({ ok: true, method: "refresh_token" });
      logger.info({ user: saved.userId }, "[kiteSession] refreshed via refresh_token");
      return saved;
    }
  } catch (err) {
    lastError = err;
    logger.warn({ err: err.message }, "[kiteSession] refresh_token refresh failed");
  }

  try {
    const refreshed = await refreshWithEnctoken(auth);
    if (refreshed) {
      const saved = await saveZerodhaAuth({
        ...refreshed,
        apiKey: refreshed.api_key || auth.apiKey,
        encToken: refreshed.enctoken || refreshed.encToken || auth.encToken,
      });
      updateHealth({ ok: true, method: "enctoken" });
      logger.info({ user: saved.userId }, "[kiteSession] refreshed via enctoken");
      return saved;
    }
  } catch (err) {
    lastError = err;
    logger.warn({ err: err.message }, "[kiteSession] enctoken refresh failed");
  }

  updateHealth({ ok: false, reason: lastError?.message || "refresh_failed" });
  const error = new Error(
    `[kiteSession] unable to refresh session: ${lastError?.message || "unknown"}`
  );
  error.cause = lastError;
  throw error;
}

export async function ensureKiteSession({ forceRefresh = false } = {}) {
  const validation = await validateKiteSession({ forceReload: forceRefresh });
  if (validation.ok) {
    return validation.auth;
  }

  if (validation.expired || forceRefresh) {
    const refreshed = await refreshKiteSession();
    const postValidation = await validateKiteSession({ forceReload: true });
    if (postValidation.ok) {
      return refreshed;
    }
  }

  throw new Error(`[kiteSession] validation failed: ${validation.reason}`);
}
