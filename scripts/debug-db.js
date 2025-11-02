// scripts/debug-db.js
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

async function main() {
  const uri = process.env.MONGO_URI;
  console.log("[debug] MONGO_URI =", uri);

  const client = new MongoClient(uri);
  await client.connect();

  // get DB from URI
  const db = client.db();
  console.log("[debug] using db name:", db.databaseName);

  // list collections
  const collections = await db.listCollections().toArray();
  console.log(
    "[debug] collections in this DB:",
    collections.map((c) => c.name)
  );

  // check tokens
  const tokenDoc = await db.collection("tokens").findOne({});
  console.log("[debug] tokens doc:", tokenDoc);

  // check top_stock_symbols
  const topDoc = await db.collection("top_stock_symbols").findOne({});
  console.log("[debug] top_stock_symbols doc:", topDoc);

  await client.close();
}

main().catch((err) => {
  console.error("[debug] ERROR:", err);
});
