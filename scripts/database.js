// /scripts/database.js
import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = "pernalongaBot";

let cachedClient = null;
let cachedDb = null;

export async function connectPernalongaBot() {
  if (cachedDb) return cachedDb;

  if (!MONGO_URI) {
    throw new Error("MONGO_URI não definida");
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URI);
    await cachedClient.connect();
  }

  cachedDb = cachedClient.db(DB_NAME);
  return cachedDb;
}
