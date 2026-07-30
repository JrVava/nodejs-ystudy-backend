import { JsonController, Post, Body, UseBefore, HttpError, Get, QueryParam, Param, Delete } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import { StudentStory } from "../../models/StudentStory";
import { ObjectId } from "mongodb";

@JsonController("/student-stories")
@UseBefore(AdminMiddleware)
export class StudentStoryController {

    @Post("/add")
    async addStudentStory(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);

            if (!decryptedBody.name) {
                throw new HttpError(400, "Name is required");
            }
            if (!decryptedBody.description) {
                throw new HttpError(400, "Description is required");
            }
            if (decryptedBody.star === undefined) {
                throw new HttpError(400, "Star rating is required");
            }
            if (decryptedBody.star < 0 || decryptedBody.star > 5) {
                throw new HttpError(400, "Star rating must be between 0 and 5");
            }

            const storyDB = new QueryBuilder<StudentStory>("student_stories");

            const newStory: StudentStory = {
                name: decryptedBody.name,
                description: decryptedBody.description,
                star: Number(decryptedBody.star),
                badge: decryptedBody.badge,
                age: decryptedBody.age ? Number(decryptedBody.age) : undefined,
                subject: decryptedBody.subject,
                year: decryptedBody.year,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await storyDB.insertOne(newStory);

            return {
                data: encrypt({
                    success: true,
                    message: "Student story added successfully",
                    storyId: result.insertedId
                })
            };
        } catch (error: any) {
            logger.error(`[StudentStoryController:addStudentStory] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/pagination")
    async listStudentStories(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const storyDB = new QueryBuilder<StudentStory>("student_stories");

            const filter: any = { isDeleted: { $ne: true } };

            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { subject: { $regex: search, $options: "i" } },
                    { badge: { $regex: search, $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await storyDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(s => ({
                        _id: s._id?.toString(),
                        name: s.name,
                        star: s.star,
                        badge: s.badge,
                        subject: s.subject,
                        status: s.status,
                        createdAt: s.createdAt,
                        updatedAt: s.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[StudentStoryController:listStudentStories] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/list")
    async getAllStudentStories() {
        try {
            const storyDB = new QueryBuilder<StudentStory>("student_stories");

            const stories = await storyDB.find({ status: true, isDeleted: { $ne: true } });

            return {
                data: encrypt({
                    success: true,
                    data: stories.map((s: any) => ({
                        _id: s._id?.toString(),
                        name: s.name,
                        description: s.description,
                        star: s.star,
                        badge: s.badge,
                        age: s.age,
                        subject: s.subject,
                        year: s.year,
                        status: s.status
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[StudentStoryController:getAllStudentStories] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getStudentStoryById(@Param("id") id: string) {
        try {
            const storyDB = new QueryBuilder<StudentStory>("student_stories");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid student story ID format");
            }

            const story = await storyDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!story) {
                throw new HttpError(404, "Student story not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: {
                        ...story,
                        _id: story._id?.toString()
                    }
                })
            };
        } catch (error: any) {
            logger.error(`[StudentStoryController:getStudentStoryById] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateStudentStory(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const storyDB = new QueryBuilder<StudentStory>("student_stories");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid student story ID format");
            }

            if (decryptedBody.star !== undefined) {
                if (decryptedBody.star < 0 || decryptedBody.star > 5) {
                    throw new HttpError(400, "Star rating must be between 0 and 5");
                }
            }

            const updateFields: any = { ...decryptedBody, updatedAt: new Date() };
            delete updateFields._id; // Prevent updating ID

            const result = await storyDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Student story not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Student story updated successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[StudentStoryController:updateStudentStory] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Delete("/delete/:id")
    async deleteStudentStory(@Param("id") id: string) {
        try {
            const storyDB = new QueryBuilder<StudentStory>("student_stories");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid student story ID format");
            }

            const result = await storyDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Student story not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Student story deleted successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[StudentStoryController:deleteStudentStory] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
