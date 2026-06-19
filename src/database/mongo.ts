import { MongoClient, Db } from "mongodb";
import { config } from "../config";

let db: Db;

export const connectDB = async (): Promise<Db> => {
  try {
    const client = new MongoClient(config.mongoDB_URI as string);

    await client.connect();

    db = client.db("ystudy"); // uses DB name from URI

    console.log("✅ MongoDB connected to ystudy database");

    return db;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

export const getDB = (): Db => {
  if (!db) {
    throw new Error("❌ Database not initialized. Call connectDB first.");
  }
  return db;
};