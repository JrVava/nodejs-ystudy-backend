import { JsonController, Post, Get, Body, HttpError, UseBefore, QueryParam, Param, Req } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { getFullImageUrl } from "../../utils/mediaUtils";
import { Course } from "../../models/Course";

@JsonController("/courses")
@UseBefore(AdminMiddleware)
export class CourseController {

    @Post("/add")
    async createCourse(@Body() body: any) {
        try {
            // Decrypt incoming payload
            const decryptedBody = decrypt(body.data);

            if (!decryptedBody.slug) {
                throw new HttpError(400, "Slug is required and cannot be empty");
            }

            const courseDB = new QueryBuilder<Course>("courses");

            // Construct new course object
            const newCourse: Course = {
                image: new ObjectId(decryptedBody.image),
                title: decryptedBody.title,
                slug: decryptedBody.slug,
                shortDescription: decryptedBody.shortDescription,
                longDescription: decryptedBody.longDescription,
                badges: Array.isArray(decryptedBody.badges) ? decryptedBody.badges : [],
                availableCourses: Array.isArray(decryptedBody.availableCourses)
                    ? decryptedBody.availableCourses.map((id: string) => new ObjectId(id))
                    : null,
                relatedCourses: Array.isArray(decryptedBody.relatedCourses)
                    ? decryptedBody.relatedCourses.map((id: string) => new ObjectId(id))
                    : null,
                salaryRange: {
                    from: decryptedBody.salaryRange?.from || 0,
                    to: decryptedBody.salaryRange?.to || 0
                },
                careerOutcomeBadge: decryptedBody.careerOutcomeBadge,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await courseDB.insertOne(newCourse);

            return {
                data: encrypt({
                    success: true,
                    message: "Course created successfully",
                    courseId: result.insertedId
                })
            };
        } catch (error) {
            logger.error(`[CourseController:createCourse] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/pagination")
    async getCourses(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10
    ) {
        try {
            const courseDB = new QueryBuilder<Course>("courses");

            const results = await courseDB.paginate({}, Number(page), Number(limit), { createdAt: -1 });

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(c => ({
                        _id: c._id?.toString(),
                        title: c.title,
                        createdAt: c.createdAt,
                        updatedAt: c.updatedAt
                    }))
                })
            };
        } catch (error) {
            logger.error(`[CourseController:getCourses] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/list")
    async getAllCourses() {
        try {
            const courseDB = new QueryBuilder<Course>("courses");

            const courses = await courseDB.find({}, {
                projection: {
                    title: 1,
                    slug: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: courses.map((c: any) => ({
                        _id: c._id?.toString(),
                        title: c.title,
                        slug: c.slug
                    }))
                })
            };
        } catch (error) {
            logger.error(`[CourseController:getAllCourses] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getCourseById(@Param("id") id: string, @Req() req: any) {
        try {
            const courseDB = new QueryBuilder<Course>("courses");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid course ID format");
            }

            const course = await courseDB.findOne({ _id: objId });
            if (!course) {
                throw new HttpError(404, "Course not found");
            }

            const fullImageUrl = await getFullImageUrl(course.image, req);

            return {
                data: encrypt({
                    success: true,
                    data: {
                        ...course,
                        _id: course._id?.toString(),
                        fullImageUrl
                    }
                })
            };
        } catch (error) {
            logger.error(`[CourseController:getCourseById] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateCourse(
        @Param("id") courseId: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const courseDB = new QueryBuilder<Course>("courses");

            let objId: ObjectId;
            try {
                objId = new ObjectId(courseId);
            } catch (e) {
                throw new HttpError(400, "Invalid course ID format");
            }

            const updateFields: any = { ...decryptedBody, updatedAt: new Date() };
            delete updateFields._id; // Prevent updating ID

            // Cast image to ObjectId if it's present in the update payload
            if (updateFields.image) {
                updateFields.image = new ObjectId(updateFields.image);
            }

            if (Array.isArray(updateFields.availableCourses)) {
                updateFields.availableCourses = updateFields.availableCourses.map((id: string) => new ObjectId(id));
            }

            if (Array.isArray(updateFields.relatedCourses)) {
                updateFields.relatedCourses = updateFields.relatedCourses.map((id: string) => new ObjectId(id));
            }

            const result = await courseDB.updateOne({ _id: objId }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Course not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Course updated successfully"
                })
            };
        } catch (error) {
            logger.error(`[CourseController:updateCourse] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
