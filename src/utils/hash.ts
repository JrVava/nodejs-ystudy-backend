// utils/hash.ts
import bcrypt from "bcrypt";
import logger from "./logger";

export const hashPassword = async (password: string) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    logger.error(`[Hash:hashPassword] Error occurred:`, error);
    throw error;
  }
};

export const comparePassword = async (password: string, hash: string) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error(`[Hash:comparePassword] Error occurred:`, error);
    throw error;
  }
};