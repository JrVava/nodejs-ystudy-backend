import { JsonController, Post, Body, UseBefore, HttpError, Get, QueryParam, Param, Delete } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import { Duration } from "../../models/Duration";
import { ObjectId } from "mongodb";

@JsonController("/durations")
@UseBefore(AdminMiddleware)
export class DurationController {

    @Post("/add")
    async addDuration(@Body() body: any) {
        try {
            // Decrypt incoming payload
            const decryptedBody = decrypt(body.data);

            if (!decryptedBody.title) {
                throw new HttpError(400, "Title is required and cannot be empty");
            }

            const durationDB = new QueryBuilder<Duration>("durations");

            // Construct new duration object
            const newDuration: Duration = {
                title: decryptedBody.title,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await durationDB.insertOne(newDuration);

            return {
                data: encrypt({
                    success: true,
                    message: "Duration added successfully",
                    durationId: result.insertedId
                })
            };
        } catch (error: any) {
            logger.error(`[DurationController:addDuration] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/pagination")
    async listDurations(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const durationDB = new QueryBuilder<Duration>("durations");

            const filter: any = { isDeleted: { $ne: true } };

            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await durationDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(d => ({
                        _id: d._id?.toString(),
                        title: d.title,
                        status: d.status,
                        createdAt: d.createdAt,
                        updatedAt: d.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[DurationController:listDurations] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/list")
    async getAllDurations() {
        try {
            const durationDB = new QueryBuilder<Duration>("durations");

            const durations = await durationDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    title: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: durations.map((d: any) => ({
                        _id: d._id?.toString(),
                        title: d.title,
                        status: d.status
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[DurationController:getAllDurations] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getDurationById(@Param("id") id: string) {
        try {
            const durationDB = new QueryBuilder<Duration>("durations");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid duration ID format");
            }

            const duration = await durationDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!duration) {
                throw new HttpError(404, "Duration not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: {
                        ...duration,
                        _id: duration._id?.toString()
                    }
                })
            };
        } catch (error: any) {
            logger.error(`[DurationController:getDurationById] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateDuration(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const durationDB = new QueryBuilder<Duration>("durations");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid duration ID format");
            }

            const updateFields: any = { ...decryptedBody, updatedAt: new Date() };
            delete updateFields._id; // Prevent updating ID

            const result = await durationDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Duration not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Duration updated successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[DurationController:updateDuration] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Delete("/delete/:id")
    async deleteDuration(@Param("id") id: string) {
        try {
            const durationDB = new QueryBuilder<Duration>("durations");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid duration ID format");
            }

            const result = await durationDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Duration not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Duration deleted successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[DurationController:deleteDuration] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
