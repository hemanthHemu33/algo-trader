// node -r dotenv/config scripts/check-instrument-misses.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "scanner_app";

function parse(symbol) {
  const [ex, ts] = symbol.split(":");
  return { exchange: ex || "NSE", tradingsymbol: ts || symbol };
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const doc = await db
    .collection("top_stock_symbols")
    .find({})
    .sort({ createdAtIST: -1, _id: -1 })
    .limit(1)
    .next();

  const universe = doc?.symbols || [];
  if (!universe.length) {
    console.log("No symbols in top_stock_symbols");
    process.exit(0);
  }

  const pairs = universe.map(parse);
  const ors = pairs.map((p) => ({
    exchange: p.exchange,
    tradingsymbol: p.tradingsymbol,
  }));

  const rows = await db
    .collection("instruments")
    .find({ $or: ors })
    .project({ exchange: 1, tradingsymbol: 1 })
    .toArray();

  const set = new Set(rows.map((r) => `${r.exchange}:${r.tradingsymbol}`));
  const misses = universe.filter((s) => !set.has(s));

  console.log("Universe:", universe);
  console.log("Missing in instruments:", misses);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
