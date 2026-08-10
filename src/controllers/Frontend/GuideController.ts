import { JsonController, Get, HttpError, Req } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Guide } from "../../models/Guide";
import { getFullImageUrl } from "../../utils/mediaUtils";

@JsonController("/frontend/guides")
export class FrontendGuideController {

    @Get("/list")
    async getAllGuides(@Req() req: any) {
        try {
            const guideDB = new QueryBuilder<Guide>("guides");
            
            // Find all active guides
            const guides = await guideDB.find({ status: true, isDeleted: { $ne: true } });

            const formattedGuides = await Promise.all(guides.map(async (guide) => {
                const fullImageUrl = await getFullImageUrl(guide.image, req);
                return {
                    _id: guide._id?.toString(),
                    title: guide.title,
                    subTitle: guide.subTitle,
                    description: guide.description,
                    link: guide.link,
                    fullImageUrl
                };
            }));

            return {
                data: encrypt({
                    success: true,
                    data: formattedGuides
                })
            };
        } catch (error) {
            logger.error(`[FrontendGuideController:getAllGuides] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
