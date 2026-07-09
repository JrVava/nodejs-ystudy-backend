import { JsonController, Get, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Qualification } from "../../models/Qualification";

@JsonController("/frontend/qualifications")
export class FrontendQualificationController {

    @Get("/")
    async getAllQualifications() {
        try {
            const qualificationDB = new QueryBuilder<Qualification>("qualifications");

            // Find all active and non-deleted qualifications
            const qualifications = await qualificationDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    title: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: qualifications.map(q => ({
                        _id: q._id?.toString(),
                        title: q.title
                    }))
                })
            };
        } catch (error) {
            logger.error(`[FrontendQualificationController:getAllQualifications] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
