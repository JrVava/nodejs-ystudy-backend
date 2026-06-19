import "dotenv/config";

if (!process.env.CRYPTO_SECRET_KEY) {
  throw new Error("CRYPTO_SECRET_KEY is missing in .env");
}

export const config = {
  port: process.env.PORT || 3000,
  timeZone: process.env.TIMEZONE || "Asia/Kolkata",
  logLevel: process.env.LOG_LEVEL || "info",
  CRYPTO_SECRET_KEY: process.env.CRYPTO_SECRET_KEY
};