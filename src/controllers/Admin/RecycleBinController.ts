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

    @Get("/collections")
    async getCollections() {
        try {
            const formattedCollections = allowedCollections.map(collection => {
                const value = collection
                    .replace(/([A-Z])/g, ' $1') // Handle camelCase
                    .replace(/_/g, ' ') // Handle snake_case
                    .trim()
                    .split(/\s+/)
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
                return { key: collection, value };
            });

            return {
                data: encrypt({
                    success: true,
                    data: formattedCollections
                })
            };
        } catch (error) {
            logger.error(`[RecycleBinController:getCollections] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/list")
    async listDeleted(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("collection") collection?: string
    ) {
        try {
            let allResults: any[] = [];

            const collectionsToSearch = collection && allowedCollections.includes(collection)
                ? [collection]
                : allowedCollections;

            for (const collectionName of collectionsToSearch) {
                const qb = new QueryBuilder<any>(collectionName);
                const results = await qb.find({ isDeleted: true }, { sort: { updatedAt: -1 } });
                const withCollection = results.map(r => ({ ...r, collectionName }));
                allResults.push(...withCollection);
            }

            // Sort all by updatedAt based on the sort parameter
            allResults.sort((a, b) => {
                const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                return sort === "asc" ? dateA - dateB : dateB - dateA;
            });

            const total = allResults.length;
            const totalPages = Math.ceil(total / Number(limit));
            const paginatedData = allResults.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit));

            return {
                data: encrypt({
                    success: true,
                    total: total,
                    page: Number(page),
                    totalPages: totalPages,
                    data: paginatedData.map(item => ({
                        ...item,
                        _id: item._id?.toString(),
                        moduleName: item.collectionName
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
        @Param("id") id: string
    ) {
        try {
            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid ID format");
            }

            let restored = false;

            for (const collectionName of allowedCollections) {
                const qb = new QueryBuilder<any>(collectionName);
                const result = await qb.updateOne(
                    { _id: objId },
                    { $unset: { isDeleted: "" }, $set: { updatedAt: new Date() } }
                );

                if (result.matchedCount > 0) {
                    restored = true;
                    break;
                }
            }

            if (!restored) {
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
        @Param("id") id: string
    ) {
        try {
            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid ID format");
            }

            let record: any = null;
            let collectionName = "";
            let qb: QueryBuilder<any> | null = null;

            for (const c of allowedCollections) {
                const tempQb = new QueryBuilder<any>(c);
                record = await tempQb.findOne({ _id: objId });
                if (record) {
                    collectionName = c;
                    qb = tempQb;
                    break;
                }
            }

            if (!record || !qb) {
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
                    const children = await qb!.find({ parentId });
                    for (const child of children) {
                        if (child._id) {
                            await deleteChildren(child._id as ObjectId);
                            await qb!.deleteById(child._id as ObjectId);
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
