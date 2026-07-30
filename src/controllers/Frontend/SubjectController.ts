import { JsonController, Get, HttpError, Req, QueryParam } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Subject } from "../../models/Subject";
import { getFullImageUrl } from "../../utils/mediaUtils";

@JsonController("/frontend/subject")
export class FrontendSubjectController {

    @Get("/")
    async getAllSubjects(
        @Req() req: any,
        @QueryParam("pageSize") pageSize?: number
    ) {
        try {
            const subjectDB = new QueryBuilder<Subject>("subjects");

            const options: any = {
                projection: {
                    createdAt: 0,
                    updatedAt: 0,
                    isDeleted: 0
                }
            };

            if (pageSize && !isNaN(pageSize)) {
                options.limit = Number(pageSize);
            }

            const subjects = await subjectDB.find({ status: true, isDeleted: { $ne: true } }, options);

            const data = await Promise.all(subjects.map(async (s) => {
                const mapped: any = {
                    ...s,
                    _id: s._id?.toString()
                };

                if (s.image) {
                    mapped.image = s.image.toString();
                    mapped.fullImageUrl = await getFullImageUrl(s.image, req);
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
            logger.error(`[FrontendSubjectController:getAllSubjects] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
