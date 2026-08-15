import { JsonController, Get, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { StudentStory } from "../../models/StudentStory";

@JsonController("/frontend/student-stories")
export class FrontendStudentStoryController {

    @Get("/")
    async getAllStudentStories() {
        try {
            const storyDB = new QueryBuilder<StudentStory>("student_stories");
            
            // Fetch stories that are active and not deleted, sorted by newest first
            const stories = await storyDB.find(
                { status: true, isDeleted: { $ne: true } },
                { sort: { createdAt: -1 } }
            );

            return {
                data: encrypt({
                    success: true,
                    data: stories.map((s: StudentStory) => ({
                        _id: s._id?.toString(),
                        badge: s.badge,
                        star: s.star,
                        description: s.description,
                        name: s.name,
                        age: s.age,
                        subject: s.subject,
                        year: s.year,
                        createdAt: s.createdAt
                    }))
                })
            };
        } catch (error) {
            logger.error(`[FrontendStudentStoryController:getAllStudentStories] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
