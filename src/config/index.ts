import "dotenv/config";

if (!process.env.CRYPTO_SECRET_KEY) {
  throw new Error("CRYPTO_SECRET_KEY is missing in .env");
}

export const config = {
  port: process.env.PORT || 3000,
  mongoDB_URI: process.env.MONGO_URI,
  timeZone: process.env.TIMEZONE || "Asia/Kolkata",
  logLevel: process.env.LOG_LEVEL || "info",
  CRYPTO_SECRET_KEY: process.env.CRYPTO_SECRET_KEY,
  jwt_secret: process.env.JWT_SECRET,
  idleTimeoutMs: process.env.IDLE_TIMEOUT_MS ? parseInt(process.env.IDLE_TIMEOUT_MS, 10) : 30 * 60 * 1000,
  jwtExpiresInMs: process.env.JWT_EXPIRES_IN_MS ? parseInt(process.env.JWT_EXPIRES_IN_MS, 10) : 2 * 60 * 60 * 1000,
  mail_reset_url: process.env.MAIL_RESET_URL,
  recipient_email_id: process.env.RECIPIENT_EMAIL_ID,
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle newlines in env
  googleSpreadsheetId: process.env.GOOGLE_SPREADSHEET_ID
};