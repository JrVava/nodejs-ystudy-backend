import { JsonController, Post, Body, UseBefore, HttpError, Get, QueryParam, Param, Delete, Req } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import { Qualification } from "../../models/Qualification";
import { ObjectId } from "mongodb";
import { getFullImageUrl } from "../../utils/mediaUtils";

@JsonController("/qualifications")
@UseBefore(AdminMiddleware)
export class QualificationController {

    @Post("/add")
    async addQualification(@Body() body: any) {
        try {
            // Decrypt incoming payload
            const decryptedBody = decrypt(body.data);

            if (!decryptedBody.title) {
                throw new HttpError(400, "Title is required and cannot be empty");
            }

            const qualificationDB = new QueryBuilder<Qualification>("qualifications");

            // Construct new qualification object
            const newQualification: Qualification = {
                title: decryptedBody.title,
                badge: decryptedBody.badge,
                description: decryptedBody.description,
                image: decryptedBody.image ? new ObjectId(decryptedBody.image) : null,
                tags: Array.isArray(decryptedBody.tags) ? decryptedBody.tags : [],
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await qualificationDB.insertOne(newQualification);

            return {
                data: encrypt({
                    success: true,
                    message: "Qualification added successfully",
                    qualificationId: result.insertedId
                })
            };
        } catch (error: any) {
            logger.error(`[QualificationController:addQualification] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/pagination")
    async listQualifications(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const qualificationDB = new QueryBuilder<Qualification>("qualifications");

            const filter: any = { isDeleted: { $ne: true } };

            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await qualificationDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(q => ({
                        _id: q._id?.toString(),
                        title: q.title,
                        status: q.status,
                        createdAt: q.createdAt,
                        updatedAt: q.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[QualificationController:listQualifications] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/list")
    async getAllQualifications() {
        try {
            const qualificationsDB = new QueryBuilder<Qualification>("qualifications");

            const qualifications = await qualificationsDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    title: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: qualifications.map((q: any) => ({
                        _id: q._id?.toString(),
                        title: q.title,
                        status: q.status
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[QualificationController:getAllQualifications] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getQualificationById(@Param("id") id: string, @Req() req: any) {
        try {
            const qualificationDB = new QueryBuilder<Qualification>("qualifications");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid qualification ID format");
            }

            const qualification = await qualificationDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!qualification) {
                throw new HttpError(404, "Qualification not found");
            }

            const fullImageUrl = qualification.image ? await getFullImageUrl(qualification.image, req) : null;

            return {
                data: encrypt({
                    success: true,
                    data: {
                        ...qualification,
                        _id: qualification._id?.toString(),
                        image: qualification.image?.toString(),
                        fullImageUrl
                    }
                })
            };
        } catch (error: any) {
            logger.error(`[QualificationController:getQualificationById] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateQualification(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const qualificationDB = new QueryBuilder<Qualification>("qualifications");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid qualification ID format");
            }

            const updateFields: any = { ...decryptedBody, updatedAt: new Date() };
            delete updateFields._id; // Prevent updating ID

            if (updateFields.image) {
                updateFields.image = new ObjectId(updateFields.image);
            }

            const result = await qualificationDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Qualification not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Qualification updated successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[QualificationController:updateQualification] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Delete("/delete/:id")
    async deleteQualification(@Param("id") id: string) {
        try {
            const qualificationDB = new QueryBuilder<Qualification>("qualifications");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid qualification ID format");
            }

            const result = await qualificationDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Qualification not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Qualification deleted successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[QualificationController:deleteQualification] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
