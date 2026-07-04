import { JsonController, Get, Post, Delete, Param, QueryParam, HttpError, UseBefore } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import fs from "fs";
import path from "path";

import { allowedCollections } from "../../constants/collections";

@JsonController("/recycle-bin")
@UseBefore(AdminMiddleware)
export class RecycleBinController {

    @Get("/list")
    async listDeleted(
        @QueryParam("collection") collectionName: string,
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10
    ) {
        try {
            if (!collectionName || !allowedCollections.includes(collectionName)) {
                throw new HttpError(400, "Invalid or missing collection name");
            }

            const qb = new QueryBuilder<any>(collectionName);
            const results = await qb.paginate({ isDeleted: true }, Number(page), Number(limit), { updatedAt: -1 });

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(item => ({
                        ...item,
                        _id: item._id?.toString()
                    }))
                })
            };
        } catch (error) {
            logger.error(`[RecycleBinController:listDeleted] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/restore/:id")
    async restoreRecord(
        @Param("id") id: string,
        @QueryParam("collection") collectionName: string
    ) {
        try {
            if (!collectionName || !allowedCollections.includes(collectionName)) {
                throw new HttpError(400, "Invalid or missing collection name");
            }

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid ID format");
            }

            const qb = new QueryBuilder<any>(collectionName);

            // Using $unset instead of $set: false to cleanly remove the flag
            const result = await qb.updateOne(
                { _id: objId },
                { $unset: { isDeleted: "" }, $set: { updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Record not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Record restored successfully"
                })
            };
        } catch (error) {
            logger.error(`[RecycleBinController:restoreRecord] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Delete("/delete/:id")
    async hardDeleteRecord(
        @Param("id") id: string,
        @QueryParam("collection") collectionName: string
    ) {
        try {
            if (!collectionName || !allowedCollections.includes(collectionName)) {
                throw new HttpError(400, "Invalid or missing collection name");
            }

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid ID format");
            }

            const qb = new QueryBuilder<any>(collectionName);
            const record = await qb.findOne({ _id: objId });

            if (!record) {
                throw new HttpError(404, "Record not found");
            }

            // Special handling for physical files
            if (collectionName === "media") {
                if (record.filePath) {
                    const absolutePath = path.join(__dirname, "../../../", record.filePath);
                    if (fs.existsSync(absolutePath)) {
                        fs.unlinkSync(absolutePath);
                    }
                }
            } else if (collectionName === "folders") {
                if (record.name) {
                    const safeFolderName = path.basename(record.name);
                    const targetDir = path.join(__dirname, "../../../media", safeFolderName);
                    if (fs.existsSync(targetDir)) {
                        fs.rmSync(targetDir, { recursive: true, force: true });
                    }
                    
                    // Also delete all media DB records inside this folder
                    const mediaDB = new QueryBuilder<any>("media");
                    const medias = await mediaDB.find({ folderId: objId });
                    for (const m of medias) {
                        if (m._id) await mediaDB.deleteById(m._id.toString());
                    }
                }
            } else if (collectionName === "navigations") {
                // Delete children for navigation
                const deleteChildren = async (parentId: ObjectId) => {
                    const children = await qb.find({ parentId });
                    for (const child of children) {
                        if (child._id) {
                            await deleteChildren(child._id as ObjectId);
                            await qb.deleteById(child._id as ObjectId);
                        }
                    }
                };
                await deleteChildren(objId);
            }

            // Execute hard delete
            const result = await qb.deleteById(id);

            if (!result || result.deletedCount === 0) {
                throw new HttpError(404, "Record not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Record permanently deleted"
                })
            };
        } catch (error) {
            logger.error(`[RecycleBinController:hardDeleteRecord] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
