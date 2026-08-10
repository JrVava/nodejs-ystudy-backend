import { JsonController, Post, Body, UseBefore, HttpError, Get, QueryParam, Param, Req, Delete } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import { Guide } from "../../models/Guide";
import { getFullImageUrl } from "../../utils/mediaUtils";

@JsonController("/guide")
@UseBefore(AdminMiddleware)
export class GuideController {

    @Post("/add")
    async addGuide(@Body() body: any) {
        try {
            // Decrypt incoming payload
            const decryptedBody = decrypt(body.data);

            if (!decryptedBody.title) {
                throw new HttpError(400, "Title is required and cannot be empty");
            }

            const guideDB = new QueryBuilder<Guide>("guides");

            // Construct new guide object
            const newGuide: Guide = {
                title: decryptedBody.title,
                subTitle: decryptedBody.subTitle,
                description: decryptedBody.description,
                link: decryptedBody.link,
                image: decryptedBody.image ? new ObjectId(decryptedBody.image) : null,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await guideDB.insertOne(newGuide);

            return {
                data: encrypt({
                    success: true,
                    message: "Guide added successfully",
                    guideId: result.insertedId
                })
            };
        } catch (error: any) {
            logger.error(`[GuideController:addGuide] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/pagination")
    async listGuides(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const guideDB = new QueryBuilder<Guide>("guides");

            const filter: any = { isDeleted: { $ne: true } };

            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await guideDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(g => ({
                        _id: g._id?.toString(),
                        title: g.title,
                        subTitle: g.subTitle,
                        status: g.status,
                        createdAt: g.createdAt,
                        updatedAt: g.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[GuideController:listGuides] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/list")
    async getAllGuides() {
        try {
            const guideDB = new QueryBuilder<Guide>("guides");

            const guides = await guideDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    title: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: guides.map((g: any) => ({
                        _id: g._id?.toString(),
                        title: g.title,
                        status: g.status
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[GuideController:getAllGuides] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getGuideById(@Param("id") id: string, @Req() req: any) {
        try {
            const guideDB = new QueryBuilder<Guide>("guides");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid guide ID format");
            }

            const guide = await guideDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!guide) {
                throw new HttpError(404, "Guide not found");
            }

            const fullImageUrl = await getFullImageUrl(guide.image, req);

            return {
                data: encrypt({
                    success: true,
                    data: {
                        ...guide,
                        _id: guide._id?.toString(),
                        fullImageUrl
                    }
                })
            };
        } catch (error: any) {
            logger.error(`[GuideController:getGuideById] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateGuide(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const guideDB = new QueryBuilder<Guide>("guides");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid guide ID format");
            }

            const updateFields: any = { ...decryptedBody, updatedAt: new Date() };
            delete updateFields._id; // Prevent updating ID

            if (updateFields.image) {
                updateFields.image = new ObjectId(updateFields.image);
            }

            const result = await guideDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Guide not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Guide updated successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[GuideController:updateGuide] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Delete("/delete/:id")
    async deleteGuide(@Param("id") id: string) {
        try {
            const guideDB = new QueryBuilder<Guide>("guides");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid guide ID format");
            }

            const result = await guideDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Guide not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Guide deleted successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[GuideController:deleteGuide] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
