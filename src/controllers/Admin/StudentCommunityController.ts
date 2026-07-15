import { JsonController, Post, Body, UseBefore, HttpError, Get, QueryParam, Param, Delete, Req } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import { StudentCommunity } from "../../models/StudentCommunity";
import { ObjectId } from "mongodb";
import { getFullImageUrl } from "../../utils/mediaUtils";

@JsonController("/student-community")
@UseBefore(AdminMiddleware)
export class StudentCommunityController {

    @Post("/add")
    async addStudentCommunity(@Body() body: any) {
        try {
            // Decrypt incoming payload
            const decryptedBody = decrypt(body.data);

            if (!decryptedBody.description) {
                throw new HttpError(400, "Description is required");
            }
            if (!decryptedBody.image) {
                throw new HttpError(400, "Image is required");
            }

            const studentCommunityDB = new QueryBuilder<StudentCommunity>("studentCommunities");

            let parsedImage: string | ObjectId = decryptedBody.image;
            if (typeof parsedImage === 'string' && /^[0-9a-fA-F]{24}$/.test(parsedImage)) {
                parsedImage = new ObjectId(parsedImage);
            }

            // Construct new student community object
            const newStudentCommunity: StudentCommunity = {
                image: parsedImage,
                description: decryptedBody.description,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await studentCommunityDB.insertOne(newStudentCommunity);

            return {
                data: encrypt({
                    success: true,
                    message: "Student community added successfully",
                    studentCommunityId: result.insertedId
                })
            };
        } catch (error: any) {
            logger.error(`[StudentCommunityController:addStudentCommunity] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/pagination")
    async listStudentCommunities(
        @Req() req: any,
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const studentCommunityDB = new QueryBuilder<StudentCommunity>("studentCommunities");

            const filter: any = { isDeleted: { $ne: true } };

            if (search) {
                filter.$or = [
                    { description: { $regex: search, $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await studentCommunityDB.paginate(filter, Number(page), Number(limit), sortOptions);

            const dataWithImages = await Promise.all(results.data.map(async (d) => ({
                _id: d._id?.toString(),
                image: d.image?.toString(),
                fullImageUrl: await getFullImageUrl(d.image, req),
                description: d.description,
                status: d.status,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt
            })));

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: dataWithImages
                })
            };
        } catch (error: any) {
            logger.error(`[StudentCommunityController:listStudentCommunities] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/edit")
    async edit(@QueryParam("id") id: string, @Req() req: any) {
        try {
            if (!id) {
                throw new HttpError(400, "ID is required");
            }
            const studentCommunityDB = new QueryBuilder<StudentCommunity>("studentCommunities");

            let queryId;
            try {
                queryId = new ObjectId(id);
            } catch (err) {
                throw new HttpError(400, "Invalid ID format");
            }

            const result = await studentCommunityDB.findOne({ _id: queryId, isDeleted: { $ne: true } });

            if (!result) {
                throw new HttpError(404, "Student community not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: {
                        _id: result._id?.toString(),
                        image: result.image?.toString(),
                        fullImageUrl: await getFullImageUrl(result.image, req),
                        description: result.description,
                        status: result.status,
                        createdAt: result.createdAt,
                        updatedAt: result.updatedAt
                    }
                })
            };
        } catch (error: any) {
            logger.error(`[StudentCommunityController:edit] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/list")
    async getAllStudentCommunities(@Req() req: any) {
        try {
            const studentCommunityDB = new QueryBuilder<StudentCommunity>("studentCommunities");

            const results = await studentCommunityDB.find({ isDeleted: { $ne: true }, status: true }, { sort: { createdAt: -1 } });

            const dataWithImages = await Promise.all(results.map(async (d) => ({
                _id: d._id?.toString(),
                image: d.image?.toString(),
                fullImageUrl: await getFullImageUrl(d.image, req),
                description: d.description,
                status: d.status,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt
            })));

            return {
                data: encrypt({
                    success: true,
                    data: dataWithImages
                })
            };
        } catch (error: any) {
            logger.error(`[StudentCommunityController:getAllStudentCommunities] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateStudentCommunity(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const studentCommunityDB = new QueryBuilder<StudentCommunity>("studentCommunities");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid Student Community ID format");
            }

            const updateFields: any = { ...decryptedBody, updatedAt: new Date() };
            delete updateFields._id; // Prevent updating ID

            if (updateFields.image && typeof updateFields.image === 'string' && /^[0-9a-fA-F]{24}$/.test(updateFields.image)) {
                updateFields.image = new ObjectId(updateFields.image);
            }

            const result = await studentCommunityDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Student community not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Student community updated successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[StudentCommunityController:updateStudentCommunity] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Delete("/delete/:id")
    async deleteStudentCommunity(@Param("id") id: string) {
        try {
            const studentCommunityDB = new QueryBuilder<StudentCommunity>("studentCommunities");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid Student Community ID format");
            }

            const result = await studentCommunityDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Student community not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Student community deleted successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[StudentCommunityController:deleteStudentCommunity] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
