import { JsonController, Post, Get, Body, HttpError, UseBefore, QueryParam, Param, Req, Delete } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { getFullImageUrl } from "../../utils/mediaUtils";
import { Course } from "../../models/Course";
import { CourseCms } from "../../models/CourseCms";

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

            if (!decryptedBody.courseType || !['General', 'Social'].includes(decryptedBody.courseType)) {
                throw new HttpError(400, "courseType is required and must be either 'General' or 'Social'");
            }

            const courseDB = new QueryBuilder<Course>("courses");

            // Construct new course object
            const newCourse: Course = {
                image: new ObjectId(decryptedBody.image),
                title: decryptedBody.title,
                slug: decryptedBody.slug,
                shortDescription: decryptedBody.shortDescription,
                longDescription: decryptedBody.longDescription,
                courseType: decryptedBody.courseType,
                badges: Array.isArray(decryptedBody.badges) ? decryptedBody.badges : [],
                entryRequirement: Array.isArray(decryptedBody.entryRequirement) ? decryptedBody.entryRequirement : [],
                availableCourses: Array.isArray(decryptedBody.availableCourses)
                    ? decryptedBody.availableCourses.map((id: string) => new ObjectId(id))
                    : null,
                relatedCourses: Array.isArray(decryptedBody.relatedCourses)
                    ? decryptedBody.relatedCourses.map((id: string) => new ObjectId(id))
                    : null,
                locations: Array.isArray(decryptedBody.locations)
                    ? decryptedBody.locations.map((id: string) => new ObjectId(id))
                    : null,
                modeType: Array.isArray(decryptedBody.modeType)
                    ? decryptedBody.modeType.map((id: string) => new ObjectId(id))
                    : null,
                salaryRange: {
                    from: decryptedBody.salaryRange?.from || 0,
                    to: decryptedBody.salaryRange?.to || 0
                },
                careerOutcomeBadge: decryptedBody.careerOutcomeBadge,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await courseDB.insertOne(newCourse);

            if (decryptedBody.courseType === 'General' && decryptedBody.courseCms) {
                const courseCmsDB = new QueryBuilder<CourseCms>("course_cms");
                const cmsData = decryptedBody.courseCms;
                
                const newCourseCms: CourseCms = {
                    courseId: result.insertedId,
                    courseType: 'General',
                    section_2: cmsData.section_2,
                    section_3: cmsData.section_3,
                    section_4: cmsData.section_4,
                    section_5: cmsData.section_5,
                    section_6: cmsData.section_6,
                    section_7: cmsData.section_7,
                    section_8: cmsData.section_8,
                    section_9: cmsData.section_9,
                    section_10: cmsData.section_10 ? {
                        ...cmsData.section_10,
                        featured_course: cmsData.section_10.featured_course ? new ObjectId(cmsData.section_10.featured_course) : null
                    } : undefined,
                    section_11: cmsData.section_11,
                    section_12: cmsData.section_12,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await courseCmsDB.insertOne(newCourseCms);
            }

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
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const courseDB = new QueryBuilder<Course>("courses");

            const filter: any = { isDeleted: { $ne: true } };

            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: "i" } },
                    { slug: { $regex: search, $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };

            const results = await courseDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(c => ({
                        _id: c._id?.toString(),
                        title: c.title,
                        status: c.status,
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

            const courses = await courseDB.find({ status: true, isDeleted: { $ne: true } }, {
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
                        slug: c.slug,
                        status: c.status
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

            const course = await courseDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!course) {
                throw new HttpError(404, "Course not found");
            }

            const fullImageUrl = await getFullImageUrl(course.image, req);

            const courseCmsDB = new QueryBuilder<CourseCms>("course_cms");
            const courseCms = await courseCmsDB.findOne({ courseId: objId, isDeleted: { $ne: true } });

            if (courseCms) {
                delete (courseCms as any)._id;
                delete (courseCms as any).courseId;
                delete (courseCms as any).isDeleted;
                delete (courseCms as any).createdAt;
                delete (courseCms as any).updatedAt;
            }

            return {
                data: encrypt({
                    success: true,
                    data: {
                        ...course,
                        _id: course._id?.toString(),
                        fullImageUrl,
                        courseCms: courseCms || null
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

            if (Array.isArray(updateFields.locations)) {
                updateFields.locations = updateFields.locations.map((id: string) => new ObjectId(id));
            }

            if (Array.isArray(updateFields.modeType)) {
                updateFields.modeType = updateFields.modeType.map((id: string) => new ObjectId(id));
            }

            const courseCmsData = updateFields.courseCms;
            delete updateFields.courseCms;

            const result = await courseDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Course not found");
            }

            if (courseCmsData) {
                const courseCmsDB = new QueryBuilder<CourseCms>("course_cms");
                const cmsUpdate: any = {
                    section_2: courseCmsData.section_2,
                    section_3: courseCmsData.section_3,
                    section_4: courseCmsData.section_4,
                    section_5: courseCmsData.section_5,
                    section_6: courseCmsData.section_6,
                    section_7: courseCmsData.section_7,
                    section_8: courseCmsData.section_8,
                    section_9: courseCmsData.section_9,
                    section_10: courseCmsData.section_10 ? {
                        ...courseCmsData.section_10,
                        featured_course: courseCmsData.section_10.featured_course ? new ObjectId(courseCmsData.section_10.featured_course) : null
                    } : undefined,
                    section_11: courseCmsData.section_11,
                    section_12: courseCmsData.section_12,
                    updatedAt: new Date()
                };

                if (decryptedBody.courseType) {
                    cmsUpdate.courseType = decryptedBody.courseType;
                }

                Object.keys(cmsUpdate).forEach(key => cmsUpdate[key] === undefined && delete cmsUpdate[key]);

                await courseCmsDB.upsertOne({ courseId: objId }, cmsUpdate);
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

    @Delete("/delete/:id")
    async deleteCourse(@Param("id") id: string) {
        try {
            const courseDB = new QueryBuilder<Course>("courses");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid course ID format");
            }

            const result = await courseDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Course not found");
            }

            const courseCmsDB = new QueryBuilder<CourseCms>("course_cms");
            await courseCmsDB.updateOne(
                { courseId: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            return {
                data: encrypt({
                    success: true,
                    message: "Course deleted successfully"
                })
            };
        } catch (error) {
            logger.error(`[CourseController:deleteCourse] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
