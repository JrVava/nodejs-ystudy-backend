import { JsonController, Post, Body, UseBefore, HttpError, Get, QueryParam, Param, Delete, Req } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import { Tool } from "../../models/Tool";
import { ObjectId } from "mongodb";
import { getFullImageUrl } from "../../utils/mediaUtils";

@JsonController("/tools")
@UseBefore(AdminMiddleware)
export class ToolController {

    @Post("/add")
    async addTool(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);

            if (!decryptedBody.title) {
                throw new HttpError(400, "Title is required");
            }
            if (!decryptedBody.description) {
                throw new HttpError(400, "Description is required");
            }
            if (!decryptedBody.time) {
                throw new HttpError(400, "Time is required");
            }
            if (!decryptedBody.link) {
                throw new HttpError(400, "Link is required");
            }
            if (!decryptedBody.mode) {
                throw new HttpError(400, "Mode is required");
            }
            if (!["paid", "free"].includes(decryptedBody.mode)) {
                throw new HttpError(400, "Mode must be either 'paid' or 'free'");
            }
            if (!decryptedBody.image) {
                throw new HttpError(400, "Image is required");
            }
            if (!ObjectId.isValid(decryptedBody.image)) {
                throw new HttpError(400, "Invalid image format");
            }

            const toolDB = new QueryBuilder<Tool>("tools");

            const newTool: Tool = {
                title: decryptedBody.title,
                description: decryptedBody.description,
                time: decryptedBody.time,
                link: decryptedBody.link,
                mode: decryptedBody.mode,
                image: new ObjectId(decryptedBody.image),
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await toolDB.insertOne(newTool);

            return {
                data: encrypt({
                    success: true,
                    message: "Tool added successfully",
                    toolId: result.insertedId
                })
            };
        } catch (error: any) {
            logger.error(`[ToolController:addTool] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/pagination")
    async listTools(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const toolDB = new QueryBuilder<Tool>("tools");

            const filter: any = { isDeleted: { $ne: true } };

            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await toolDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(s => ({
                        _id: s._id?.toString(),
                        title: s.title,
                        time: s.time,
                        mode: s.mode,
                        image: s.image?.toString(),
                        status: s.status,
                        createdAt: s.createdAt,
                        updatedAt: s.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[ToolController:listTools] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/list")
    async getAllTools() {
        try {
            const toolDB = new QueryBuilder<Tool>("tools");

            const tools = await toolDB.find({ status: true, isDeleted: { $ne: true } });

            return {
                data: encrypt({
                    success: true,
                    data: tools.map((s: any) => ({
                        _id: s._id?.toString(),
                        title: s.title,
                        description: s.description,
                        time: s.time,
                        link: s.link,
                        mode: s.mode,
                        image: s.image?.toString(),
                        status: s.status
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[ToolController:getAllTools] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getToolById(@Param("id") id: string, @Req() req: any) {
        try {
            const toolDB = new QueryBuilder<Tool>("tools");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid tool ID format");
            }

            const tool = await toolDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!tool) {
                throw new HttpError(404, "Tool not found");
            }

            const fullImageUrl = tool.image ? await getFullImageUrl(tool.image, req) : null;

            return {
                data: encrypt({
                    success: true,
                    data: {
                        ...tool,
                        _id: tool._id?.toString(),
                        image: tool.image?.toString(),
                        fullImageUrl
                    }
                })
            };
        } catch (error: any) {
            logger.error(`[ToolController:getToolById] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateTool(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const toolDB = new QueryBuilder<Tool>("tools");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid tool ID format");
            }

            const updateFields: any = { ...decryptedBody, updatedAt: new Date() };
            delete updateFields._id; // Prevent updating ID

            if (updateFields.mode !== undefined && !["paid", "free"].includes(updateFields.mode)) {
                throw new HttpError(400, "Mode must be either 'paid' or 'free'");
            }

            if (updateFields.image) {
                if (!ObjectId.isValid(updateFields.image)) {
                    throw new HttpError(400, "Invalid image format");
                }
                updateFields.image = new ObjectId(updateFields.image);
            }

            const result = await toolDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Tool not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Tool updated successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[ToolController:updateTool] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Delete("/delete/:id")
    async deleteTool(@Param("id") id: string) {
        try {
            const toolDB = new QueryBuilder<Tool>("tools");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid tool ID format");
            }

            const result = await toolDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Tool not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Tool deleted successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[ToolController:deleteTool] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
