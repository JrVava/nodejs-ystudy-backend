// src/middleware/encrypted.ts

import { Request, Response, NextFunction } from "express";
import { encrypt } from "../utils/crypto";

const SKIP_ROUTES = ["/api/raw-decrypt"];

export const encryptMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  
  if (SKIP_ROUTES.includes(req.path)) {
    return next();
  }
    const originalJson = res.json.bind(res);

  res.json = (data: any) => {
    // Skip for file uploads
    if (
      req.headers["content-type"]?.includes("multipart/form-data")
    ) {
      return originalJson(data);
    }

    return originalJson({
      data: encrypt(data),
    });
  };

  next();
};