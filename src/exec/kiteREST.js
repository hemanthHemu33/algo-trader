// src/exec/kiteREST.js
import { KiteConnect } from "kiteconnect";
import { getZerodhaAuth } from "../data/brokerToken.js";
import { logger } from "../utils/logger.js";

let _kc = null;

function parseSymbol(exchangeSymbol) {
  // "NSE:TCS" -> { exchange: "NSE", tradingsymbol: "TCS" }
  const [exchange, tradingsymbol] = exchangeSymbol.split(":");
  return { exchange, tradingsymbol };
}

export async function initKiteREST() {
  if (_kc) return _kc;

  const auth = await getZerodhaAuth();
  if (!auth.apiKey || !auth.accessToken) {
    throw new Error(
      "[kiteREST] missing apiKey/accessToken. Can't send live orders."
    );
  }

  const kc = new KiteConnect({ api_key: auth.apiKey });
  kc.setAccessToken(auth.accessToken);

  _kc = kc;
  logger.info(
    { user: auth.userId },
    "[kiteREST] KiteConnect REST client initialized"
  );
  return _kc;
}

/**
 * placeMISMarketOrder(symbol, qty, side)
 * side = "BUY" | "SELL"
 *
 * Sends a regular MIS intraday MARKET order.
 * Zerodha’s REST endpoint under the hood is POST /orders/:variety,
 * and in the JS SDK it's kc.placeOrder("regular", params). :contentReference[oaicite:9]{index=9}
 */
export async function placeMISMarketOrder(symbol, qty, side) {
  const kc = await initKiteREST();
  const { exchange, tradingsymbol } = parseSymbol(symbol);

  const params = {
    exchange, // "NSE"
    tradingsymbol, // "TCS"
    transaction_type: side.toUpperCase(), // "BUY" or "SELL"
    quantity: qty,
    product: "MIS", // intraday
    order_type: "MARKET",
    validity: "DAY",
  };

  logger.info(
    { params },
    "[kiteREST] placing MIS MARKET order via KiteConnect"
  );

  const resp = await kc.placeOrder("regular", params);

  logger.info(
    { order_id: resp.order_id, symbol, side, qty },
    "[kiteREST] order placed"
  );

  return resp;
}

/**
 * squareOffPosition(symbol, qty)
 * quick helper for exiting a long with a SELL or exiting a short with a BUY.
 */
export async function squareOffPosition(symbol, qty, currentSide) {
  // If we are long (we bought), to exit we SELL.
  // If we are short (we sold first), to exit we BUY.
  const exitSide = currentSide === "LONG" ? "SELL" : "BUY";
  return placeMISMarketOrder(symbol, qty, exitSide);
}
