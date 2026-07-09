import { JsonController, Get, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Subject } from "../../models/Subject";

@JsonController("/frontend/subject")
export class FrontendSubjectController {

    @Get("/")
    async getAllSubjects() {
        try {
            const subjectDB = new QueryBuilder<Subject>("subjects");

            const subjects = await subjectDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    title: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: subjects.map(s => ({
                        _id: s._id?.toString(),
                        title: s.title
                    }))
                })
            };
        } catch (error) {
            logger.error(`[FrontendSubjectController:getAllSubjects] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
