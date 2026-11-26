import { JsonController, Post, Get, Body, Param, QueryParam, HttpError, UseBefore, Put } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { AdviserCall, AdviserCallStatus } from "../../models/AdviserCall";

const allStatuses: AdviserCallStatus[] = [
    "Under process",
    "completed",
    "reviwed",
    "pending",
    "failed"
];

const allowedStatuses: string[] = [
    ...allStatuses,
    "reviewed"
];

@JsonController("/adviser-call")
@UseBefore(AdminMiddleware)
export class AdviserCallController {

    @Get("/pagination")
    async listAdviserCalls(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string,
        @QueryParam("status") status?: string
    ) {
        try {
            const adviserCallDB = new QueryBuilder<AdviserCall>("adviser_calls");

            const filter: any = { isDeleted: { $ne: true } };

            if (status && status.trim() !== "") {
                filter.status = status.trim();
            }

            if (search && search.trim() !== "") {
                const term = search.trim();
                const regex = { $regex: term, $options: "i" };
                filter.$or = [
                    { name: regex },
                    { email: regex },
                    { phone: regex },
                    { contactMethod: regex },
                    { topic: regex },
                    { preferredDay: regex },
                    { preferredTimeSlot: regex },
                    { discuss: regex }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await adviserCallDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(item => ({
                        _id: item._id?.toString(),
                        name: item.name || "",
                        email: item.email || "",
                        phone: item.phone || "",
                        contactMethod: item.contactMethod || "",
                        topic: item.topic || "",
                        preferredDay: item.preferredDay || "",
                        preferredTimeSlot: item.preferredTimeSlot || "",
                        discuss: item.discuss || "",
                        is_agree: item.is_agree,
                        status: item.status || "pending",
                        isNotificationSend: item.isNotificationSend !== undefined ? Boolean(item.isNotificationSend) : false,
                        isNotificationSendToAdmin: item.isNotificationSendToAdmin !== undefined ? Boolean(item.isNotificationSendToAdmin) : false,
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[AdviserCallController:listAdviserCalls] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/statuses")
    async getAllStatuses() {
        try {
            return {
                data: encrypt({
                    success: true,
                    data: allStatuses
                })
            };
        } catch (error: any) {
            logger.error(`[AdviserCallController:getAllStatuses] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/all-status")
    async getAllStatusesAlias() {
        return this.getAllStatuses();
    }

    @Post("/update-status/:id")
    async updateStatus(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            let decryptedBody = body;
            if (body && body.data) {
                try {
                    decryptedBody = decrypt(body.data);
                } catch {
                    decryptedBody = body;
                }
            }

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid ID format");
            }

            const status = decryptedBody.status;
            if (!status || !allowedStatuses.includes(status)) {
                throw new HttpError(400, `Invalid status. Must be one of: ${allStatuses.join(", ")}`);
            }

            const adviserCallDB = new QueryBuilder<AdviserCall>("adviser_calls");
            const result = await adviserCallDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { status, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Adviser call record not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Status updated successfully",
                    status
                })
            };
        } catch (error: any) {
            logger.error(`[AdviserCallController:updateStatus] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Put("/update-status/:id")
    async updateStatusPut(
        @Param("id") id: string,
        @Body() body: any
    ) {
        return this.updateStatus(id, body);
    }
}

// Alias for /adviserCall
@JsonController("/adviserCall")
@UseBefore(AdminMiddleware)
export class AdviserCallCamelCaseController extends AdviserCallController { }
