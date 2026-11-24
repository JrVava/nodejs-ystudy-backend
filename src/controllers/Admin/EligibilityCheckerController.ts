import { JsonController, Post, Get, Body, Param, QueryParam, HttpError, UseBefore, Put } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { EligibilityChecker, EligibilityCheckerStatus } from "../../models/EligibilityChecker";

const allStatuses: EligibilityCheckerStatus[] = [
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

@JsonController("/eligibility-checker")
@UseBefore(AdminMiddleware)
export class EligibilityCheckerController {

    @Get("/pagination")
    async listEligibilityCheckers(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string,
        @QueryParam("status") status?: string
    ) {
        try {
            const eligibilityCheckerDB = new QueryBuilder<EligibilityChecker>("eligibility_checkers");

            const filter: any = { isDeleted: { $ne: true } };

            if (status && status.trim() !== "") {
                filter.status = status.trim();
            }

            if (search && search.trim() !== "") {
                const term = search.trim();
                const regex = { $regex: term, $options: "i" };
                filter.$or = [
                    { firstName: regex },
                    { email: regex },
                    { phone: regex },
                    { residencyStatus: regex },
                    { studiedBefore: regex },
                    { study: regex },
                    { household: regex },
                    { bestTimeToCall: regex }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await eligibilityCheckerDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(item => ({
                        _id: item._id?.toString(),
                        residencyStatus: item.residencyStatus || "",
                        studiedBefore: item.studiedBefore || "",
                        study: item.study || "",
                        household: item.household || "",
                        firstName: item.firstName || "",
                        email: item.email || "",
                        phone: item.phone || "",
                        bestTimeToCall: item.bestTimeToCall || "",
                        is_agree: item.is_agree,
                        isNotificationSend: item.isNotificationSend !== undefined ? Boolean(item.isNotificationSend) : false,
                        status: item.status || "pending",
                        isNotificationSendToAdmin: item.isNotificationSendToAdmin !== undefined ? Boolean(item.isNotificationSendToAdmin) : false,
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[EligibilityCheckerController:listEligibilityCheckers] Error occurred:`, error);
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
            logger.error(`[EligibilityCheckerController:getAllStatuses] Error occurred:`, error);
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

            const eligibilityCheckerDB = new QueryBuilder<EligibilityChecker>("eligibility_checkers");
            const result = await eligibilityCheckerDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { status, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Eligibility checker record not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Status updated successfully",
                    status
                })
            };
        } catch (error: any) {
            logger.error(`[EligibilityCheckerController:updateStatus] Error occurred:`, error);
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

// Alias for /eligibilityChecker
@JsonController("/eligibilityChecker")
@UseBefore(AdminMiddleware)
export class EligibilityCheckerCamelCaseController extends EligibilityCheckerController { }
