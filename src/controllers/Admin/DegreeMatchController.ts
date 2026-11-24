import { JsonController, Post, Get, Body, Param, QueryParam, HttpError, UseBefore, Put } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { DegreeMatch, DegreeMatchStatus } from "../../models/DegreeMatch";

const allStatuses: DegreeMatchStatus[] = [
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

@JsonController("/degree-match")
@UseBefore(AdminMiddleware)
export class DegreeMatchController {

    @Get("/pagination")
    async listDegreeMatches(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string,
        @QueryParam("status") status?: string
    ) {
        try {
            const degreeMatchDB = new QueryBuilder<DegreeMatch>("degree_matches");

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
                    { highestQualification: regex },
                    { subjectsInterest: regex },
                    { study: regex },
                    { career: regex },
                    { situation: regex },
                    { salaryLevel: regex },
                    { ageRange: regex },
                    { languageConfident: regex },
                    { HouseholdIncome: regex },
                    { responsibilities: regex },
                    { bestTimeToCall: regex }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await degreeMatchDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(item => ({
                        _id: item._id?.toString(),
                        residencyStatus: item.residencyStatus || "",
                        highestQualification: item.highestQualification || "",
                        subjectsInterest: item.subjectsInterest || "",
                        study: item.study || "",
                        salaryLevel: item.salaryLevel || "",
                        situation: item.situation || "",
                        ageRange: item.ageRange || "",
                        languageConfident: item.languageConfident || "",
                        HouseholdIncome: item.HouseholdIncome || "",
                        career: item.career || "",
                        responsibilities: item.responsibilities || "",
                        firstName: item.firstName || "",
                        email: item.email || "",
                        phone: item.phone || "",
                        bestTimeToCall: item.bestTimeToCall || "",
                        status: item.status || "pending",
                        is_agree: item.is_agree,
                        isNotificationSend: item.isNotificationSend !== undefined ? Boolean(item.isNotificationSend) : false,
                        isNotificationSendToAdmin: item.isNotificationSendToAdmin !== undefined ? Boolean(item.isNotificationSendToAdmin) : false,
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[DegreeMatchController:listDegreeMatches] Error occurred:`, error);
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
            logger.error(`[DegreeMatchController:getAllStatuses] Error occurred:`, error);
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

            const degreeMatchDB = new QueryBuilder<DegreeMatch>("degree_matches");
            const result = await degreeMatchDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { status, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Degree match record not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Status updated successfully",
                    status
                })
            };
        } catch (error: any) {
            logger.error(`[DegreeMatchController:updateStatus] Error occurred:`, error);
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

// Alias for /degreeMatch
@JsonController("/degreeMatch")
@UseBefore(AdminMiddleware)
export class DegreeMatchCamelCaseController extends DegreeMatchController { }
