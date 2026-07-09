import { JsonController, Get, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Duration } from "../../models/Duration";

@JsonController("/frontend/durations")
export class FrontendDurationController {

    @Get("/")
    async getAllDurations() {
        try {
            const durationDB = new QueryBuilder<Duration>("durations");

            // Find all active and non-deleted durations
            const durations = await durationDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    title: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: durations.map(d => ({
                        _id: d._id?.toString(),
                        title: d.title
                    }))
                })
            };
        } catch (error) {
            logger.error(`[FrontendDurationController:getAllDurations] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
