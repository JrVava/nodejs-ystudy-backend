import { JsonController, Get, HttpError, Req } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { StudentStory } from "../../models/StudentStory";
import { getFullImageUrl } from "../../utils/mediaUtils";

@JsonController("/frontend/student-stories")
export class FrontendStudentStoryController {

    @Get("/")
    async getAllStudentStories(
        @Req() req: any
    ) {
        try {
            const storyDB = new QueryBuilder<StudentStory>("student_stories");
            
            // Fetch stories that are active and not deleted, sorted by newest first
            const stories = await storyDB.find(
                { status: true, isDeleted: { $ne: true } },
                { sort: { createdAt: -1 } }
            );

            const data = await Promise.all(stories.map(async (s: StudentStory) => {
                let fullImageUrl = "";
                if (s.image) {
                    fullImageUrl = (await getFullImageUrl(s.image, req)) || "";
                }
                return {
                    _id: s._id?.toString(),
                    badge: s.badge,
                    star: s.star,
                    description: s.description,
                    name: s.name,
                    age: s.age,
                    subject: s.subject,
                    year: s.year,
                    image: s.image?.toString(),
                    fullImageUrl,
                    createdAt: s.createdAt
                };
            }));

            return {
                data: encrypt({
                    success: true,
                    data
                })
            };
        } catch (error) {
            logger.error(`[FrontendStudentStoryController:getAllStudentStories] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
