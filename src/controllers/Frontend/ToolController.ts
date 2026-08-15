import { JsonController, Get, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Tool } from "../../models/Tool";

@JsonController("/frontend/tools")
export class FrontendToolController {

    @Get("/")
    async getAllTools() {
        try {
            const toolDB = new QueryBuilder<Tool>("tools");
            
            // Fetch tools that are active and not deleted, sorted by newest first
            const tools = await toolDB.find(
                { status: true, isDeleted: { $ne: true } },
                { sort: { createdAt: -1 } }
            );

            return {
                data: encrypt({
                    success: true,
                    data: tools.map((t: Tool) => ({
                        _id: t._id?.toString(),
                        image: t.image?.toString(),
                        title: t.title,
                        description: t.description,
                        time: t.time,
                        link: t.link,
                        mode: t.mode,
                        createdAt: t.createdAt
                    }))
                })
            };
        } catch (error) {
            logger.error(`[FrontendToolController:getAllTools] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
