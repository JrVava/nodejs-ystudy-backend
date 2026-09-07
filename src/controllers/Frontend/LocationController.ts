import { JsonController, Get, HttpError, Req } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Location } from "../../models/Location";
import { getFullImageUrl } from "../../utils/mediaUtils";

@JsonController("/frontend/locations")
export class FrontendLocationController {

    @Get("/")
    async getAllLocations(
        @Req() req: any
    ) {
        try {
            const locationDB = new QueryBuilder<Location>("locations");

            const locations = await locationDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    title: 1,
                    image: 1
                }
            });

            const data = await Promise.all(locations.map(async (loc) => {
                const mapped: any = {
                    _id: loc._id?.toString(),
                    title: loc.title
                };

                if (loc.image) {
                    mapped.image = loc.image.toString();
                    mapped.fullImageUrl = await getFullImageUrl(loc.image, req);
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
            logger.error(`[FrontendLocationController:getAllLocations] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
