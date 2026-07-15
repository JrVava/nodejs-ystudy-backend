import { JsonController, Get, HttpError, Req } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { StudentCommunity } from "../../models/StudentCommunity";
import { getFullImageUrl } from "../../utils/mediaUtils";

@JsonController("/frontend/student-community")
export class FrontendStudentCommunityController {

    @Get("/")
    async getStudentCommunities(@Req() req: any) {
        try {
            const studentCommunityDB = new QueryBuilder<StudentCommunity>("studentCommunities");

            const studentCommunities = await studentCommunityDB.find({ status: true, isDeleted: { $ne: true } });

            const data = await Promise.all(studentCommunities.map(async (sc) => {
                const mapped: any = {
                    _id: sc._id?.toString(),
                    description: sc.description,
                };

                if (sc.image) {
                    mapped.image = sc.image.toString();
                    mapped.fullImageUrl = await getFullImageUrl(sc.image, req);
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
            logger.error(`[FrontendStudentCommunityController:getStudentCommunities] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
