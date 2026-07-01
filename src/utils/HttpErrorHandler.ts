import { Middleware, ExpressErrorMiddlewareInterface, HttpError } from "routing-controllers";
import { Request, Response, NextFunction } from "express";
import logger from "./logger";
import { encrypt } from "./crypto";

@Middleware({ type: "after" })
export class HttpErrorHandler implements ExpressErrorMiddlewareInterface {
    error(error: any, request: Request, response: Response, next: NextFunction) {
        logger.error(`[HttpErrorHandler] Error occurred:`, error);
        
        let statusCode = 500;
        let message = "Internal server error";

        // Check if it's an HttpError from routing-controllers or a custom error with httpCode
        if (error instanceof HttpError || (error && (error as any).httpCode)) {
            statusCode = (error as any).httpCode || 500;
            message = error.message;
        } else if (error instanceof Error) {
            message = error.message;
        }

        // Send an encrypted structured error response
        const errorData = {
            success: false,
            message: message,
            errors: (error as any).errors || undefined
        };

        response.status(statusCode).json({
            data: encrypt(errorData)
        });
    }
}
