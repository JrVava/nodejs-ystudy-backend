import { JsonController, Post, Get, Body, Param, QueryParam, HttpError, UseBefore, Put } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { BecomeAnAdviser, BecomeAnAdviserStatus } from "../../models/BecomeAnAdviser";

const allStatuses: BecomeAnAdviserStatus[] = [
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

@JsonController("/become-an-adviser")
@UseBefore(AdminMiddleware)
export class BecomeAnAdviserController {

    @Get("/pagination")
    async listBecomeAnAdvisers(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string,
        @QueryParam("status") status?: string
    ) {
        try {
            const adviserDB = new QueryBuilder<BecomeAnAdviser>("become_an_advisers");

            const filter: any = { isDeleted: { $ne: true } };

            if (status && status.trim() !== "") {
                filter.status = status.trim();
            }

            if (search && search.trim() !== "") {
                const term = search.trim();
                const regex = { $regex: term, $options: "i" };
                filter.$or = [
                    { fullName: regex },
                    { email: regex },
                    { phone: regex },
                    { bestDescription: regex },
                    { audienceEnquiry: regex }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await adviserDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(item => ({
                        _id: item._id?.toString(),
                        fullName: item.fullName || "",
                        email: item.email || "",
                        phone: item.phone || "",
                        bestDescription: item.bestDescription || "",
                        audienceEnquiry: item.audienceEnquiry || "",
                        status: item.status || "pending",
                        isNotificationSend: item.isNotificationSend !== undefined ? Boolean(item.isNotificationSend) : false,
                        isNotificationSendToAdmin: item.isNotificationSendToAdmin !== undefined ? Boolean(item.isNotificationSendToAdmin) : false,
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[BecomeAnAdviserController:listBecomeAnAdvisers] Error occurred:`, error);
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
            logger.error(`[BecomeAnAdviserController:getAllStatuses] Error occurred:`, error);
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

            const adviserDB = new QueryBuilder<BecomeAnAdviser>("become_an_advisers");
            const result = await adviserDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { status, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Become an adviser record not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Status updated successfully",
                    status
                })
            };
        } catch (error: any) {
            logger.error(`[BecomeAnAdviserController:updateStatus] Error occurred:`, error);
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

// Alias for /becomeAnAdviser
@JsonController("/becomeAnAdviser")
@UseBefore(AdminMiddleware)
export class BecomeAnAdviserCamelCaseController extends BecomeAnAdviserController { }
