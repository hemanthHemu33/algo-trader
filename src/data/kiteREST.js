// src/data/kiteREST.js
import { KiteConnect } from "kiteconnect";
import { logger } from "../utils/logger.js";
import { ensureKiteSession, refreshKiteSession } from "./kiteSession.js";

let _kc = null;
let _kcAccessToken = null;

// lazy init the Kite client
export async function getKiteClient() {
  const auth = await ensureKiteSession();

  if (_kc && _kcAccessToken === auth.accessToken) return _kc;

  const kc = new KiteConnect({ api_key: auth.apiKey });
  kc.setAccessToken(auth.accessToken);
  kc.setSessionExpiryHook(async () => {
    logger.warn("[kiteREST] session expired. attempting refresh");
    try {
      await refreshKiteSession();
      _kc = null;
      _kcAccessToken = null;
      await getKiteClient();
      logger.info("[kiteREST] session refreshed after expiry");
    } catch (err) {
      logger.error({ err: err.message }, "[kiteREST] failed to refresh session");
    }
  });

  _kc = kc;
  _kcAccessToken = auth.accessToken;
  return _kc;
}

// get cash / margin available for equities intraday
export async function fetchAvailableEquityMargin() {
  const kc = await getKiteClient();

  try {
    // kc.getMargins("equity") -> funds for equity segment
    // Zerodha's margins API returns available cash, utilised, etc.,
    // e.g. { available: { cash: 6466.8, live_balance: 6466.8 }, ... } for equity. :contentReference[oaicite:6]{index=6}
    const m = await kc.getMargins("equity");

    const liveBalance =
      m?.available?.live_balance ?? m?.available?.cash ?? m?.net ?? 0;

    return liveBalance;
  } catch (err) {
    logger.error(
      { err: err?.message },
      "[kiteREST] failed to fetch equity margin"
    );
    throw err;
  }
}

// place market BUY MIS
export async function placeMISBuy({ symbol, qty }) {
  const kc = await getKiteClient();

  // symbol is "NSE:RELIANCE". Zerodha split: exchange=NSE, tradingsymbol=RELIANCE
  const [exchange, tradingsymbol] = symbol.split(":");

  const orderParams = {
    exchange,
    tradingsymbol,
    transaction_type: "BUY",
    order_type: "MARKET",
    product: "MIS",
    quantity: qty,
    validity: "DAY",
  };

  const resp = await kc.placeOrder("regular", orderParams);
  const orderId = resp?.order_id ?? resp;

  logger.info({ symbol, qty, orderId }, "[kiteREST] BUY order placed");
  return { orderId };
}

// place market SELL MIS (square off / stoploss exit etc.)
export async function placeMISSell({ symbol, qty }) {
  const kc = await getKiteClient();
  const [exchange, tradingsymbol] = symbol.split(":");

  const orderParams = {
    exchange,
    tradingsymbol,
    transaction_type: "SELL",
    order_type: "MARKET",
    product: "MIS",
    quantity: qty,
    validity: "DAY",
  };

  const resp = await kc.placeOrder("regular", orderParams);
  const orderId = resp?.order_id ?? resp;

  logger.info({ symbol, qty, orderId }, "[kiteREST] SELL order placed");
  return { orderId };
}

export async function placeMISStopLossSell({ symbol, qty, triggerPrice }) {
  const kc = await getKiteClient();
  const [exchange, tradingsymbol] = symbol.split(":");

  const orderParams = {
    exchange,
    tradingsymbol,
    transaction_type: "SELL",
    order_type: "SL-M",
    product: "MIS",
    quantity: qty,
    trigger_price: triggerPrice,
    validity: "DAY",
  };

  const resp = await kc.placeOrder("regular", orderParams);
  const orderId = resp?.order_id ?? resp;
  logger.info({ symbol, qty, orderId, triggerPrice }, "[kiteREST] SL-M placed");
  return { orderId };
}

export async function placeMISTargetSell({ symbol, qty, price }) {
  const kc = await getKiteClient();
  const [exchange, tradingsymbol] = symbol.split(":");

  const orderParams = {
    exchange,
    tradingsymbol,
    transaction_type: "SELL",
    order_type: "LIMIT",
    product: "MIS",
    quantity: qty,
    price,
    validity: "DAY",
  };

  const resp = await kc.placeOrder("regular", orderParams);
  const orderId = resp?.order_id ?? resp;
  logger.info({ symbol, qty, orderId, price }, "[kiteREST] target LIMIT placed");
  return { orderId };
}

export async function placeMISStopLossBuy({ symbol, qty, triggerPrice }) {
  const kc = await getKiteClient();
  const [exchange, tradingsymbol] = symbol.split(":");

  const orderParams = {
    exchange,
    tradingsymbol,
    transaction_type: "BUY",
    order_type: "SL-M",
    product: "MIS",
    quantity: qty,
    trigger_price: triggerPrice,
    validity: "DAY",
  };

  const resp = await kc.placeOrder("regular", orderParams);
  const orderId = resp?.order_id ?? resp;
  logger.info({ symbol, qty, orderId, triggerPrice }, "[kiteREST] SL-M BUY placed");
  return { orderId };
}

export async function placeMISTargetBuy({ symbol, qty, price }) {
  const kc = await getKiteClient();
  const [exchange, tradingsymbol] = symbol.split(":");

  const orderParams = {
    exchange,
    tradingsymbol,
    transaction_type: "BUY",
    order_type: "LIMIT",
    product: "MIS",
    quantity: qty,
    price,
    validity: "DAY",
  };

  const resp = await kc.placeOrder("regular", orderParams);
  const orderId = resp?.order_id ?? resp;
  logger.info({ symbol, qty, orderId, price }, "[kiteREST] target BUY LIMIT placed");
  return { orderId };
}

export async function cancelRegularOrder(orderId) {
  const kc = await getKiteClient();
  await kc.cancelOrder("regular", orderId);
  logger.info({ orderId }, "[kiteREST] cancelled order");
}

export async function fetchOrderHistory(orderId) {
  const kc = await getKiteClient();
  const history = await kc.getOrderHistory(orderId);
  const latest = Array.isArray(history) && history.length
    ? history[history.length - 1]
    : null;
  return { latest, history };
}

export async function fetchOrderTrades(orderId) {
  const kc = await getKiteClient();
  return kc.getOrderTrades(orderId);
}

export async function fetchOrders() {
  const kc = await getKiteClient();
  return kc.getOrders();
}
