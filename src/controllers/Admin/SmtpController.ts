import { JsonController, Post, Get, Body, HttpError, UseBefore } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { Smtp } from "../../models/Smtp";

@JsonController("/smtp")
@UseBefore(AdminMiddleware)
export class SmtpController {

    @Get("/get")
    async getSmtp() {
        try {
            const smtpDB = new QueryBuilder<Smtp>("smtps");
            const record = await smtpDB.findOne({ isDeleted: { $ne: true } });

            return {
                data: encrypt({
                    success: true,
                    data: record || null
                })
            };
        } catch (error) {
            logger.error(`[SmtpController:getSmtp] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/add")
    async createSmtp(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);
            const smtpDB = new QueryBuilder<Smtp>("smtps");

            const existingRecord = await smtpDB.findOne({ isDeleted: { $ne: true } });
            if (existingRecord) {
                throw new HttpError(400, "SMTP configuration already exists. Please use the update endpoint.");
            }

            if (!decryptedBody.host || !decryptedBody.port || !decryptedBody.user) {
                throw new HttpError(400, "Host, port, and user are required fields.");
            }

            const newSmtp: Smtp = {
                host: decryptedBody.host,
                port: Number(decryptedBody.port),
                user: decryptedBody.user,
                password: decryptedBody.password,
                secure: decryptedBody.secure !== undefined ? decryptedBody.secure : true,
                fromEmail: decryptedBody.fromEmail,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await smtpDB.insertOne(newSmtp);

            return {
                data: encrypt({
                    success: true,
                    message: "SMTP configuration added successfully"
                })
            };
        } catch (error) {
            logger.error(`[SmtpController:createSmtp] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update")
    async updateSmtp(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);
            const smtpDB = new QueryBuilder<Smtp>("smtps");

            const existingRecord = await smtpDB.findOne({ isDeleted: { $ne: true } });
            if (!existingRecord) {
                throw new HttpError(404, "SMTP configuration not found. Please add one first.");
            }

            const updateData: any = { updatedAt: new Date() };

            if (decryptedBody.host !== undefined) updateData.host = decryptedBody.host;
            if (decryptedBody.port !== undefined) updateData.port = Number(decryptedBody.port);
            if (decryptedBody.user !== undefined) updateData.user = decryptedBody.user;
            if (decryptedBody.password !== undefined) updateData.password = decryptedBody.password;
            if (decryptedBody.secure !== undefined) updateData.secure = decryptedBody.secure;
            if (decryptedBody.fromEmail !== undefined) updateData.fromEmail = decryptedBody.fromEmail;
            if (decryptedBody.status !== undefined) updateData.status = decryptedBody.status;

            await smtpDB.updateOne(
                { _id: existingRecord._id },
                { $set: updateData }
            );

            return {
                data: encrypt({
                    success: true,
                    message: "SMTP configuration updated successfully"
                })
            };
        } catch (error) {
            logger.error(`[SmtpController:updateSmtp] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
