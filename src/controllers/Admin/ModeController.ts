import { JsonController, Post, Body, UseBefore, HttpError, Get, QueryParam, Param, Delete } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import { Mode } from "../../models/Mode";
import { ObjectId } from "mongodb";

@JsonController("/modes")
@UseBefore(AdminMiddleware)
export class ModeController {

    @Post("/add")
    async addMode(@Body() body: any) {
        try {
            // Decrypt incoming payload
            const decryptedBody = decrypt(body.data);

            if (!decryptedBody.title) {
                throw new HttpError(400, "Title is required and cannot be empty");
            }

            const modeDB = new QueryBuilder<Mode>("modes");

            // Construct new mode object
            const newMode: Mode = {
                title: decryptedBody.title,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await modeDB.insertOne(newMode);

            return {
                data: encrypt({
                    success: true,
                    message: "Mode added successfully",
                    modeId: result.insertedId
                })
            };
        } catch (error: any) {
            logger.error(`[ModeController:addMode] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/pagination")
    async listModes(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const modeDB = new QueryBuilder<Mode>("modes");

            const filter: any = { isDeleted: { $ne: true } };

            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await modeDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(m => ({
                        _id: m._id?.toString(),
                        title: m.title,
                        status: m.status,
                        createdAt: m.createdAt,
                        updatedAt: m.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[ModeController:listModes] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/list")
    async getAllModes() {
        try {
            const modeDB = new QueryBuilder<Mode>("modes");

            const modes = await modeDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    title: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: modes.map((m: any) => ({
                        _id: m._id?.toString(),
                        title: m.title,
                        status: m.status
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[ModeController:getAllModes] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getModeById(@Param("id") id: string) {
        try {
            const modeDB = new QueryBuilder<Mode>("modes");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid mode ID format");
            }

            const mode = await modeDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!mode) {
                throw new HttpError(404, "Mode not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: {
                        ...mode,
                        _id: mode._id?.toString()
                    }
                })
            };
        } catch (error: any) {
            logger.error(`[ModeController:getModeById] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateMode(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const modeDB = new QueryBuilder<Mode>("modes");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid mode ID format");
            }

            const updateFields: any = { ...decryptedBody, updatedAt: new Date() };
            delete updateFields._id; // Prevent updating ID

            const result = await modeDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Mode not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Mode updated successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[ModeController:updateMode] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Delete("/delete/:id")
    async deleteMode(@Param("id") id: string) {
        try {
            const modeDB = new QueryBuilder<Mode>("modes");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid mode ID format");
            }

            const result = await modeDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Mode not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Mode deleted successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[ModeController:deleteMode] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
