import { JsonController, Get, HttpError, Req } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Qualification } from "../../models/Qualification";
import { getFullImageUrl } from "../../utils/mediaUtils";

@JsonController("/frontend/qualifications")
export class FrontendQualificationController {

    @Get("/")
    async getAllQualifications(@Req() req: any) {
        try {
            const qualificationDB = new QueryBuilder<Qualification>("qualifications");

            // Find all active and non-deleted qualifications
            const qualifications = await qualificationDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    createdAt: 0,
                    updatedAt: 0,
                    isDeleted: 0
                }
            });

            const data = await Promise.all(qualifications.map(async (q) => {
                const mapped: any = {
                    ...q,
                    _id: q._id?.toString()
                };

                if (q.image) {
                    mapped.image = q.image.toString();
                    mapped.fullImageUrl = await getFullImageUrl(q.image, req);
                }

                return mapped;
            }));

            return {
                data: encrypt({
                    success: true,
                    data
                })
            };
        } catch (error) {
            logger.error(`[FrontendQualificationController:getAllQualifications] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
