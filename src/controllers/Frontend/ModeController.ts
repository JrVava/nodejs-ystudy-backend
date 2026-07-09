import { JsonController, Get, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Mode } from "../../models/Mode";

@JsonController("/frontend/modes")
export class FrontendModeController {

    @Get("/")
    async getAllModes() {
        try {
            const modeDB = new QueryBuilder<Mode>("modes");

            // Find all active and non-deleted modes
            const modes = await modeDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    title: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: modes.map(m => ({
                        _id: m._id?.toString(),
                        title: m.title
                    }))
                })
            };
        } catch (error) {
            logger.error(`[FrontendModeController:getAllModes] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
