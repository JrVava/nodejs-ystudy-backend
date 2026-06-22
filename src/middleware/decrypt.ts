import { Request, Response, NextFunction } from "express";
import { decrypt } from "../utils/crypto";
import logger from "../utils/logger";

const SKIP_ROUTES = ["/api/raw-decrypt"];

export const decryptMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (SKIP_ROUTES.includes(req.path)) {
            return next();
        }

        // ✅ Skip decryption if file upload
        if (
            req.headers["content-type"]?.includes("multipart/form-data")
        ) {
            return next();
        }

        if (req.body?.data) {
            req.body = decrypt(req.body.data);
        }

        next();
    } catch (err) {
        logger.error(`[DecryptMiddleware:use] Error occurred:`, err);
        return res.status(400).json({ message: "Invalid encrypted payload" });
    }
};