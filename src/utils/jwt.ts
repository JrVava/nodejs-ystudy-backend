import jwt from "jsonwebtoken";
import { config } from "../config";
import logger from "./logger";

const SECRET = config.jwt_secret as string;

export const generateToken = (payload: any) => {
  try {
    // jsonwebtoken expects expiration in seconds if a number is provided
    const expiresInSeconds = Math.floor(config.jwtExpiresInMs / 1000);
    return jwt.sign(payload, SECRET, { expiresIn: expiresInSeconds });
  } catch (error) {
    logger.error(`[JWT:generateToken] Error occurred:`, error);
    throw error;
  }
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    logger.error(`[JWT:verifyToken] Error occurred:`, error);
    throw error;
  }
};