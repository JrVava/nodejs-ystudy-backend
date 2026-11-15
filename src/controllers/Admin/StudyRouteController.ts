import { JsonController, Post, Body, UseBefore, HttpError, Get, QueryParam, Param, Delete, Put } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import { StudyRoute } from "../../models/StudyRoute";

@JsonController("/study-routes")
@UseBefore(AdminMiddleware)
export class StudyRouteController {

    @Post("/add")
    async addStudyRoute(@Body() body: any) {
        try {
            // Decrypt incoming payload
            const decryptedBody = decrypt(body.data);

            if (!decryptedBody.title || typeof decryptedBody.title !== "string" || !decryptedBody.title.trim()) {
                throw new HttpError(400, "Title is required and cannot be empty");
            }
            if (!decryptedBody.slug || typeof decryptedBody.slug !== "string" || !decryptedBody.slug.trim()) {
                throw new HttpError(400, "Slug is required and cannot be empty");
            }
            if (!decryptedBody.description || typeof decryptedBody.description !== "string" || !decryptedBody.description.trim()) {
                throw new HttpError(400, "Description is required and cannot be empty");
            }

            const studyRouteDB = new QueryBuilder<StudyRoute>("study_routes");

            // Check if slug already exists
            const existingStudyRoute = await studyRouteDB.findOne({ slug: decryptedBody.slug.trim(), isDeleted: { $ne: true } });
            if (existingStudyRoute) {
                throw new HttpError(400, "Study route with this slug already exists");
            }

            // Construct new study route object
            const newStudyRoute: StudyRoute = {
                title: decryptedBody.title.trim(),
                description: decryptedBody.description.trim(),
                slug: decryptedBody.slug.trim(),
                link: decryptedBody.link ? decryptedBody.link.trim() : "",
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await studyRouteDB.insertOne(newStudyRoute);

            return {
                data: encrypt({
                    success: true,
                    message: "Study route added successfully",
                    studyRouteId: result.insertedId
                })
            };
        } catch (error: any) {
            logger.error(`[StudyRouteController:addStudyRoute] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/pagination")
    async listStudyRoutes(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const studyRouteDB = new QueryBuilder<StudyRoute>("study_routes");

            const filter: any = { isDeleted: { $ne: true } };

            if (search && search.trim() !== "") {
                filter.$or = [
                    { title: { $regex: search.trim(), $options: "i" } },
                    { slug: { $regex: search.trim(), $options: "i" } },
                    { description: { $regex: search.trim(), $options: "i" } },
                    { link: { $regex: search.trim(), $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await studyRouteDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(sr => ({
                        _id: sr._id?.toString(),
                        title: sr.title,
                        description: sr.description,
                        slug: sr.slug,
                        link: sr.link,
                        status: sr.status,
                        createdAt: sr.createdAt,
                        updatedAt: sr.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[StudyRouteController:listStudyRoutes] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/list")
    async getAllStudyRoutes() {
        try {
            const studyRouteDB = new QueryBuilder<StudyRoute>("study_routes");

            const studyRoutes = await studyRouteDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    title: 1,
                    description: 1,
                    slug: 1,
                    link: 1,
                    status: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: studyRoutes.map((sr: any) => ({
                        _id: sr._id?.toString(),
                        title: sr.title,
                        description: sr.description,
                        slug: sr.slug,
                        link: sr.link,
                        status: sr.status
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[StudyRouteController:getAllStudyRoutes] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getStudyRouteById(@Param("id") id: string) {
        try {
            const studyRouteDB = new QueryBuilder<StudyRoute>("study_routes");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid study route ID format");
            }

            const studyRoute = await studyRouteDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!studyRoute) {
                throw new HttpError(404, "Study route not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: {
                        ...studyRoute,
                        _id: studyRoute._id?.toString()
                    }
                })
            };
        } catch (error: any) {
            logger.error(`[StudyRouteController:getStudyRouteById] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateStudyRoute(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const studyRouteDB = new QueryBuilder<StudyRoute>("study_routes");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid study route ID format");
            }

            if (decryptedBody.slug) {
                const existingStudyRoute = await studyRouteDB.findOne({ slug: decryptedBody.slug.trim(), isDeleted: { $ne: true } });
                if (existingStudyRoute && existingStudyRoute._id?.toString() !== id) {
                    throw new HttpError(400, "Study route with this slug already exists");
                }
            }

            const updateFields: any = { updatedAt: new Date() };
            if (decryptedBody.title !== undefined) updateFields.title = decryptedBody.title;
            if (decryptedBody.description !== undefined) updateFields.description = decryptedBody.description;
            if (decryptedBody.slug !== undefined) updateFields.slug = decryptedBody.slug;
            if (decryptedBody.link !== undefined) updateFields.link = decryptedBody.link;
            if (decryptedBody.status !== undefined) updateFields.status = decryptedBody.status;

            const result = await studyRouteDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Study route not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Study route updated successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[StudyRouteController:updateStudyRoute] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Put("/update/:id")
    async updateStudyRoutePut(
        @Param("id") id: string,
        @Body() body: any
    ) {
        return this.updateStudyRoute(id, body);
    }

    @Delete("/delete/:id")
    async deleteStudyRoute(@Param("id") id: string) {
        try {
            const studyRouteDB = new QueryBuilder<StudyRoute>("study_routes");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid study route ID format");
            }

            const result = await studyRouteDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Study route not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Study route deleted successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[StudyRouteController:deleteStudyRoute] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Put("/toggle-status/:id")
    async toggleStatus(@Param("id") id: string) {
        try {
            const studyRouteDB = new QueryBuilder<StudyRoute>("study_routes");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid study route ID format");
            }

            const item = await studyRouteDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!item) {
                throw new HttpError(404, "Study route not found");
            }

            const newStatus = !item.status;
            await studyRouteDB.updateOne({ _id: objId }, { $set: { status: newStatus, updatedAt: new Date() } });

            return {
                data: encrypt({
                    success: true,
                    message: `Study route status updated to ${newStatus ? "active" : "inactive"}`,
                    status: newStatus
                })
            };
        } catch (error: any) {
            logger.error(`[StudyRouteController:toggleStatus] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}

// Alias for singular /study-route
@JsonController("/study-route")
@UseBefore(AdminMiddleware)
export class SingleStudyRouteController extends StudyRouteController { }

