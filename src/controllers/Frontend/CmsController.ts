import { JsonController, Post, Body, HttpError, Req } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { populateImages } from "../../utils/mediaUtils";
import { decrypt, encrypt } from "../../utils/crypto";

@JsonController("/frontend/cms")
export class FrontendCmsController {

    @Post("/")
    async getCmsBySlug(@Body() body: any, @Req() req: any) {
        try {
            const decryptedBody = decrypt(body.data);
            const slug = decryptedBody?.slug;
            const qb = new QueryBuilder<any>("page_cms_data");
            // Querying by page (slug) and checking top-level status
            const page = await qb.findOne({ page: slug, isDeleted: { $ne: true } });

            if (!page) {
                throw new HttpError(404, "Page not found or is inactive");
            }

            // Populate any image references with their full URLs
            const populatedPage = await populateImages(page, req);

            const formattedPage: any = {
                ...populatedPage,
                _id: page._id?.toString(),
            };

            // Filter out sections where status is not true to keep response payload minimal and fast
            const finalData: any = {};
            for (const [key, value] of Object.entries(formattedPage)) {
                if (key.startsWith("section_")) {
                    const section: any = value;
                    if (section && section.status === true) {
                        finalData[key] = section;
                    }
                } else {
                    finalData[key] = value;
                }
            }

            return {
                data: encrypt({
                    success: true,
                    data: finalData
                })
            };
        } catch (error) {
            logger.error(`[FrontendCmsController:getCmsBySlug] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
