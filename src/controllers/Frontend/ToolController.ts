import { JsonController, Get, HttpError, Req } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Tool } from "../../models/Tool";
import { getFullImageUrl } from "../../utils/mediaUtils";

@JsonController("/frontend/tools")
export class FrontendToolController {

    @Get("/")
    async getAllTools(@Req() req: any) {
        try {
            const toolDB = new QueryBuilder<Tool>("tools");

            // Fetch tools that are active and not deleted, sorted by newest first
            const tools = await toolDB.find(
                { status: true, isDeleted: { $ne: true } },
                { sort: { createdAt: -1 } }
            );

            const data = await Promise.all(tools.map(async (q) => {
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
            logger.error(`[FrontendToolController:getAllTools] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
