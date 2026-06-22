import crypto from "crypto";
import { config } from "../config";
import logger from "./logger";

const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = Buffer.from(config.CRYPTO_SECRET_KEY, "hex");
const IV = Buffer.alloc(16, 0); // fixed IV (can improve later)

// Encrypt
export const encrypt = (data: any) => {
    try {
        const json = JSON.stringify(data);

        const cipher = crypto.createCipheriv(
            ALGORITHM,
            Buffer.from(SECRET_KEY),
            IV
        );

        let encrypted = cipher.update(json, "utf8", "base64");
        encrypted += cipher.final("base64");
        return encrypted;
    } catch (error) {
        logger.error(`[Crypto:encrypt] Error occurred:`, error);
        throw error;
    }
};

// Decrypt
export const decrypt = (encryptedData: string) => {
    try {
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            Buffer.from(SECRET_KEY),
            IV
        );

        let decrypted = decipher.update(encryptedData, "base64", "utf8");
        decrypted += decipher.final("utf8");
        return JSON.parse(decrypted);
    } catch (error) {
        logger.error(`[Crypto:decrypt] Error occurred:`, error);
        throw error;
    }
};