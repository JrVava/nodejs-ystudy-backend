import { JsonController, Get, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { StudyRoute } from "../../models/StudyRoute";

@JsonController("/frontend/study-routes")
export class FrontendStudyRouteController {

    @Get("/")
    async getAllStudyRoutes() {
        try {
            const studyRouteDB = new QueryBuilder<StudyRoute>("study_routes");

            // Find all active and non-deleted study routes
            const routes = await studyRouteDB.find(
                { status: { $ne: false }, isDeleted: { $ne: true } },
                {
                    projection: {
                        _id: 1,
                        title: 1,
                        description: 1,
                        slug: 1,
                        link: 1
                    }
                }
            );

            const data = routes.map((r) => ({
                _id: r._id?.toString(),
                id: r._id?.toString(),
                title: r.title,
                description: r.description,
                slug: r.slug,
                link: r.link
            }));

            return {
                data: encrypt({
                    success: true,
                    data
                })
            };
        } catch (error) {
            logger.error(`[FrontendStudyRouteController:getAllStudyRoutes] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}

// Alias for singular /frontend/study-route
@JsonController("/frontend/study-route")
export class FrontendSingleStudyRouteController extends FrontendStudyRouteController {}

