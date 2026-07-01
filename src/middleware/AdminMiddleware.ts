import { ExpressMiddlewareInterface, HttpError } from "routing-controllers";
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { config } from "../config";
import logger from "../utils/logger";
import { encrypt } from "../utils/crypto";

const userLastActivity: Record<string, number> = {};

export class AdminMiddleware implements ExpressMiddlewareInterface {
  use(request: Request, response: Response, next: NextFunction): void {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      response.status(401).json({
        data: encrypt({ success: false, message: "Access denied. No token provided." })
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    
    try {
      const decoded: any = verifyToken(token);
      
      if (decoded.role !== "admin") {
        response.status(403).json({
          data: encrypt({ success: false, message: "Access denied. Admin role required." })
        });
        return;
      }

      const now = Date.now();
      const lastActive = userLastActivity[decoded.id] || now;

      // If idle for more than the configured timeout, reject the request
      if (now - lastActive > config.idleTimeoutMs) {
        delete userLastActivity[decoded.id];
        response.status(401).json({
          data: encrypt({ success: false, message: "Session expired due to inactivity." })
        });
        return;
      }

      // Update their last activity timestamp
      userLastActivity[decoded.id] = now;
      
      // Attach the decoded user payload to the request
      (request as any).user = decoded;
      
      next();
    } catch (error) {
      logger.error(`[AdminMiddleware:use] Error occurred:`, error);
      const message = error instanceof HttpError ? error.message : "Invalid or expired token.";
      const status = error instanceof HttpError ? error.httpCode : 401;
      
      response.status(status).json({
        data: encrypt({ success: false, message })
      });
      return;
    }
  }
}
