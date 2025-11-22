# Algo Trader (Intraday + Scalping)

This repository now ships with a full **scalping algo** on top of the existing intraday core. The focus is on 1-minute candles, fast indicators (EMA/VWAP), and automatically converting signals into live orders with strict risk controls.

## Folder layout

- `src/scalping/`
  - `config/` – scalping defaults (universe, thresholds, transport).
  - `data/` – scalper-friendly candle hub that keeps a trimmed rolling history.
  - `strategy/ScalpEngine.js` – converts 1m candles into normalized signals.
  - `execution/` – risk + order handler that turns signals into trades.
  - `transport/` – REST publisher (optional when running in auto-exec mode).
  - `runtime/` – helpers to attach the engine and start the scalping trader or scanner.
- `src/data/` – shared data layer (DB, Zerodha stream, candle store, etc.).
- `src/api/` – REST endpoints for the execution core (health/status, manual actions).

## Running the intraday core

```bash
node src/main.js
```

## Running the scalping scalper (auto execution)

The scalper pulls the live universe from Mongo (`top_stock_symbols`), runs the `ScalpEngine`, gates through the risk engine,
and places BUY/SELL orders automatically (with protective exits) via Kite. If the DB list is empty, it falls back to
`SCALPING_INSTRUMENTS`.

```bash
export TRADING_MODE=SCALPING
export MONGO_URI="<mongo connection>"
export ZERODHA_API_KEY="<kite api key>"
export SCALPING_INSTRUMENTS="NFO:NIFTY24APR17600CE,NFO:BANKNIFTY24APR37000CE"
node src/scalping/main.js
```

The scalper will:

1. Connect to Mongo + Zerodha session and load the universe from DB.
2. Aggregate live ticks into 1-minute candles while keeping only the latest window in memory.
3. Run `ScalpEngine` on each closed candle to generate buy/sell scalp signals.
4. Apply risk sizing and immediately place BUY or SELL market entries with matching protective orders.
5. Track positions in memory and expose health/status via the REST API.

> If you want to keep publishing signals to an external execution service, call `startScalpingScanner()` instead and
> attach your own `/api/signals` listener. The default `src/scalping/main.js` now runs the full auto-execution path.
