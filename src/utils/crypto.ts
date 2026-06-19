import crypto from "crypto";
import { config } from "../config";

const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = Buffer.from(config.CRYPTO_SECRET_KEY, "hex");
const IV = Buffer.alloc(16, 0); // fixed IV (can improve later)

// Encrypt
export const encrypt = (data: any) => {
    const json = JSON.stringify(data);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        Buffer.from(SECRET_KEY),
        IV
    );

    let encrypted = cipher.update(json, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
};

// Decrypt
export const decrypt = (encryptedData: string) => {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(SECRET_KEY),
        IV
    );

    let decrypted = decipher.update(encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
};