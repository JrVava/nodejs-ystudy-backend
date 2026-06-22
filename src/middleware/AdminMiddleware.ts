import { ExpressMiddlewareInterface, HttpError } from "routing-controllers";
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { config } from "../config";
import logger from "../utils/logger";

const userLastActivity: Record<string, number> = {};

export class AdminMiddleware implements ExpressMiddlewareInterface {
  use(request: Request, response: Response, next: NextFunction): void {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HttpError(401, "Access denied. No token provided.");
    }

    const token = authHeader.split(" ")[1];
    
    try {
      const decoded: any = verifyToken(token);
      
      if (decoded.role !== "admin") {
        throw new HttpError(403, "Access denied. Admin role required.");
      }

      const now = Date.now();
      const lastActive = userLastActivity[decoded.id] || now;

      // If idle for more than the configured timeout, reject the request
      if (now - lastActive > config.idleTimeoutMs) {
        delete userLastActivity[decoded.id];
        throw new HttpError(401, "Session expired due to inactivity.");
      }

      // Update their last activity timestamp
      userLastActivity[decoded.id] = now;
      
      // Attach the decoded user payload to the request
      (request as any).user = decoded;
      
      next();
    } catch (error) {
      logger.error(`[AdminMiddleware:use] Error occurred:`, error);
      if (error instanceof HttpError) throw error;
      throw new HttpError(401, "Invalid or expired token.");
    }
  }
}
