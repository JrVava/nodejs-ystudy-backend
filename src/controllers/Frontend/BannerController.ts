import { JsonController, Get, Param, HttpError, Req } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Banner } from "../../models/Banner";
import { getFullImageUrl } from "../../utils/mediaUtils";

@JsonController("/frontend/banners")
export class FrontendBannerController {

    @Get("/:slug")
    async getBannerBySlug(@Param("slug") slug: string, @Req() req: any) {
        try {
            const bannerDB = new QueryBuilder<Banner>("banners");

            // Assuming the internalName acts as the slug for banners
            const banner = await bannerDB.findOne({ internalName: slug, isActive: true });

            if (!banner) {
                throw new HttpError(404, "Banner not found");
            }

            const fullImageUrl = await getFullImageUrl(banner.background?.imageUrl, req);

            return {
                success: true,
                data: { ...banner, _id: banner._id?.toString(), fullImageUrl }
            };
        } catch (error) {
            logger.error(`[FrontendBannerController:getBannerBySlug] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
