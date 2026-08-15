import { JsonController, Get, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { UpcomingIntake } from "../../models/UpcomingIntake";

@JsonController("/frontend/upcoming-intakes")
export class FrontendUpcomingIntakeController {

    @Get("/")
    async getAllUpcomingIntakes() {
        try {
            const intakeDB = new QueryBuilder<UpcomingIntake>("upcoming_intakes");
            
            // Fetch upcoming intakes that are active and not deleted, sorted by newest first
            const intakes = await intakeDB.find(
                { status: true, isDeleted: { $ne: true } },
                { sort: { createdAt: -1 } }
            );

            return {
                data: encrypt({
                    success: true,
                    data: intakes.map((i: UpcomingIntake) => ({
                        _id: i._id?.toString(),
                        year: i.year,
                        month: i.month,
                        subjectId: i.subjectId?.toString() || null,
                        qualificationId: i.qualificationId?.toString() || null,
                        link: i.link,
                        createdAt: i.createdAt
                    }))
                })
            };
        } catch (error) {
            logger.error(`[FrontendUpcomingIntakeController:getAllUpcomingIntakes] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
