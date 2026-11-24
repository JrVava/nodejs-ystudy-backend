import { JsonController, Post, Get, Body, Param, QueryParam, HttpError, UseBefore } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { FormSendEmailToUser } from "../../models/FormSendEmailToUser";

@JsonController("/form-send-email-to-user")
@UseBefore(AdminMiddleware)
export class FormSendEmailToUserController {

    @Get("/pagination")
    async listFormSendEmails(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const formSendEmailDB = new QueryBuilder<FormSendEmailToUser>("form_send_email_to_users");

            const filter: any = { isDeleted: { $ne: true } };

            if (search && search.trim() !== "") {
                filter.$or = [
                    { formName: { $regex: search.trim(), $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await formSendEmailDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(item => ({
                        _id: item._id?.toString(),
                        formName: item.formName,
                        sendEmail: item.sendEmail,
                        sendEmailToAdmin: item.sendEmailToAdmin,
                        status: item.status,
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[FormSendEmailToUserController:listFormSendEmails] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Post("/update-status/:id")
    async updateStatus(
        @Param("id") id: string,
        @Body({ required: false }) body?: any
    ) {
        try {
            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch {
                throw new HttpError(400, "Invalid ID format");
            }

            let decryptedBody: any = {};
            if (body) {
                if (body.data) {
                    try {
                        decryptedBody = decrypt(body.data);
                    } catch {
                        decryptedBody = body;
                    }
                } else {
                    decryptedBody = body;
                }
            }

            const formSendEmailDB = new QueryBuilder<FormSendEmailToUser>("form_send_email_to_users");
            const existing = await formSendEmailDB.findOne({ _id: objId, isDeleted: { $ne: true } });

            if (!existing) {
                throw new HttpError(404, "Record not found");
            }

            const updateFields: any = { updatedAt: new Date() };

            if (decryptedBody.status !== undefined) {
                updateFields.status = Boolean(decryptedBody.status);
            } else {
                updateFields.status = !existing.status;
            }

            await formSendEmailDB.updateOne({ _id: objId }, { $set: updateFields });

            return {
                data: encrypt({
                    success: true,
                    message: "Status updated successfully",
                    status: updateFields.status
                })
            };
        } catch (error: any) {
            logger.error(`[FormSendEmailToUserController:updateStatus] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Post("/update-send-email/:id")
    async updateSendEmail(
        @Param("id") id: string,
        @Body({ required: false }) body?: any
    ) {
        try {
            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch {
                throw new HttpError(400, "Invalid ID format");
            }

            let decryptedBody: any = {};
            if (body) {
                if (body.data) {
                    try {
                        decryptedBody = decrypt(body.data);
                    } catch {
                        decryptedBody = body;
                    }
                } else {
                    decryptedBody = body;
                }
            }

            const formSendEmailDB = new QueryBuilder<FormSendEmailToUser>("form_send_email_to_users");
            const existing = await formSendEmailDB.findOne({ _id: objId, isDeleted: { $ne: true } });

            if (!existing) {
                throw new HttpError(404, "Record not found");
            }

            const updateFields: any = { updatedAt: new Date() };

            if (decryptedBody.sendEmail !== undefined) {
                updateFields.sendEmail = Boolean(decryptedBody.sendEmail);
            } else {
                updateFields.sendEmail = !existing.sendEmail;
            }

            await formSendEmailDB.updateOne({ _id: objId }, { $set: updateFields });

            return {
                data: encrypt({
                    success: true,
                    message: "Send email updated successfully",
                    sendEmail: updateFields.sendEmail
                })
            };
        } catch (error: any) {
            logger.error(`[FormSendEmailToUserController:updateSendEmail] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Post("/update-send-email-to-admin/:id")
    async updateSendEmailToAdmin(
        @Param("id") id: string,
        @Body({ required: false }) body?: any
    ) {
        try {
            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch {
                throw new HttpError(400, "Invalid ID format");
            }

            let decryptedBody: any = {};
            if (body) {
                if (body.data) {
                    try {
                        decryptedBody = decrypt(body.data);
                    } catch {
                        decryptedBody = body;
                    }
                } else {
                    decryptedBody = body;
                }
            }

            const formSendEmailDB = new QueryBuilder<FormSendEmailToUser>("form_send_email_to_users");
            const existing = await formSendEmailDB.findOne({ _id: objId, isDeleted: { $ne: true } });

            if (!existing) {
                throw new HttpError(404, "Record not found");
            }

            const updateFields: any = { updatedAt: new Date() };

            if (decryptedBody.sendEmailToAdmin !== undefined) {
                updateFields.sendEmailToAdmin = Boolean(decryptedBody.sendEmailToAdmin);
            } else {
                updateFields.sendEmailToAdmin = !existing.sendEmailToAdmin;
            }

            await formSendEmailDB.updateOne({ _id: objId }, { $set: updateFields });

            return {
                data: encrypt({
                    success: true,
                    message: "Send email to admin updated successfully",
                    sendEmail: updateFields.sendEmailToAdmin
                })
            };
        } catch (error: any) {
            logger.error(`[FormSendEmailToUserController:updateSendEmailToAdmin] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
