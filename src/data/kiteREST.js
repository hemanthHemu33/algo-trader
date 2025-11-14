// src/data/kiteREST.js
import { KiteConnect } from "kiteconnect";
import { getZerodhaAuth } from "./brokerToken.js";
import { logger } from "../utils/logger.js";

let _kc = null;

// lazy init the Kite client
export async function getKiteClient() {
  if (_kc) return _kc;

  const auth = await getZerodhaAuth();
  if (!auth.apiKey || !auth.accessToken) {
    throw new Error("[kiteREST] missing apiKey or accessToken");
  }

  const kc = new KiteConnect({ api_key: auth.apiKey });
  kc.setAccessToken(auth.accessToken);

  _kc = kc;
  return _kc;
}

// get cash / margin available for equities intraday
export async function fetchAvailableEquityMargin() {
  const kc = await getKiteClient();

  // kc.getMargins("equity") -> funds for equity segment
  // Zerodha's margins API returns available cash, utilised, etc.,
  // e.g. { available: { cash: 6466.8, live_balance: 6466.8 }, ... } for equity. :contentReference[oaicite:6]{index=6}
  const m = await kc.getMargins("equity");

  const liveBalance =
    m?.available?.live_balance ?? m?.available?.cash ?? m?.net ?? 0;

  return liveBalance;
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

  const orderId = await kc.placeOrder("regular", orderParams);
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

  const orderId = await kc.placeOrder("regular", orderParams);
  logger.info({ symbol, qty, orderId }, "[kiteREST] SELL order placed");
  return { orderId };
}
