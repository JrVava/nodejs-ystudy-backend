import { JsonController, Post, Get, Body, Param, QueryParam, HttpError, UseBefore, Put } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { PartnerForm, PartnerFormStatus } from "../../models/PartnerForm";

const allStatuses: PartnerFormStatus[] = [
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

export const allowedModules = [
    { label: "Become An Adviser", value: "becomeAnAdviser" },
    { label: "Influencers", value: "influencers" },
    { label: "Affiliate Partners", value: "affiliatePartners" },
    { label: "Business", value: "business" },
    { label: "Refer A friend", value: "referAFriend" }
];

@JsonController("/partner-form")
@UseBefore(AdminMiddleware)
export class PartnerFormController {

    @Get("/pagination")
    async listPartnerForms(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string,
        @QueryParam("status") status?: string,
        @QueryParam("module") moduleParam: string = "becomeAnAdviser"
    ) {
        try {
            const partnerFormDB = new QueryBuilder<PartnerForm>("partner_forms");

            const filter: any = { isDeleted: { $ne: true } };

            if (status && status.trim() !== "") {
                filter.status = status.trim();
            }

            const targetModule = (moduleParam && moduleParam.trim() !== "") ? moduleParam.trim() : "becomeAnAdviser";
            if (targetModule.toLowerCase() !== "all") {
                filter.module = { $regex: new RegExp(`^${targetModule}$`, "i") };
            }

            if (search && search.trim() !== "") {
                const term = search.trim();
                const regex = { $regex: term, $options: "i" };
                filter.$or = [
                    { module: regex },
                    { fullName: regex },
                    { email: regex },
                    { phone: regex },
                    { bestDescription: regex },
                    { audienceEnquiry: regex }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await partnerFormDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    selectedModule: targetModule,
                    data: results.data.map(item => ({
                        _id: item._id?.toString(),
                        module: item.module || "becomeAnAdviser",
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
            logger.error(`[PartnerFormController:listPartnerForms] Error occurred:`, error);
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
            logger.error(`[PartnerFormController:getAllStatuses] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/all-status")
    async getAllStatusesAlias() {
        return this.getAllStatuses();
    }

    @Get("/modules")
    async getAllModules() {
        try {
            return {
                data: encrypt({
                    success: true,
                    data: allowedModules
                })
            };
        } catch (error: any) {
            logger.error(`[PartnerFormController:getAllModules] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/all-modules")
    async getAllModulesAlias() {
        return this.getAllModules();
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

            const partnerFormDB = new QueryBuilder<PartnerForm>("partner_forms");
            const result = await partnerFormDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { status, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Partner form record not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Status updated successfully",
                    status
                })
            };
        } catch (error: any) {
            logger.error(`[PartnerFormController:updateStatus] Error occurred:`, error);
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

// Aliases for /partnerForm and backward compatibility
@JsonController("/partnerForm")
@UseBefore(AdminMiddleware)
export class PartnerFormCamelCaseController extends PartnerFormController { }

@JsonController("/become-an-adviser")
@UseBefore(AdminMiddleware)
export class BecomeAnAdviserController extends PartnerFormController { }

@JsonController("/becomeAnAdviser")
@UseBefore(AdminMiddleware)
export class BecomeAnAdviserCamelCaseController extends PartnerFormController { }
