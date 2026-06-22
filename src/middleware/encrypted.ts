// src/middleware/encrypted.ts

import { Request, Response, NextFunction } from "express";
import { encrypt } from "../utils/crypto";
import logger from "../utils/logger";

const SKIP_ROUTES = ["/api/raw-decrypt"];

export const encryptMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  
  try {
    if (SKIP_ROUTES.includes(req.path)) {
      return next();
    }
    const originalJson = res.json.bind(res);

    res.json = (data: any) => {
      try {
        // Skip for file uploads
        if (
          req.headers["content-type"]?.includes("multipart/form-data")
        ) {
          return originalJson(data);
        }

        return originalJson({
          data: encrypt(data),
        });
      } catch (err) {
        logger.error(`[EncryptMiddleware:jsonHook] Error occurred:`, err);
        return originalJson({ message: "Encryption failed" });
      }
    };

    next();
  } catch (err) {
    logger.error(`[EncryptMiddleware:use] Error occurred:`, err);
    return res.status(500).json({ message: "Internal server error" });
  }
};