import { JsonController, Get, Put, Delete, Body, Param, HttpError, UseBefore } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { ObjectId } from "mongodb";
import { Navigation } from "../../models/Navigation";
import { Course } from "../../models/Course";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import { buildTree } from "../../utils/navigation";

@JsonController("/navigations")
@UseBefore(AdminMiddleware)
export class NavigationController {

    @Get("/")
    async getAllPages() {
        try {
            const qb = new QueryBuilder<Navigation>("navigations");
            const pages = await qb.find({ isDeleted: { $ne: true }, slug: { $ne: 'home' } });
            const formattedPages = pages.map(p => ({
                ...p,
                _id: p._id!.toString(),
                parentId: p.parentId ? p.parentId.toString() : null
            }));
            return {
                data: encrypt({
                    success: true,
                    data: buildTree(formattedPages)
                })
            };
        } catch (error) {
            logger.error(`[NavigationController:getAllPages] Error occurred:`, error);
            throw error;
        }
    }

    @Get("/flat")
    async getFlatPages() {
        try {
            const qb = new QueryBuilder<Navigation>("navigations");
            const pages = await qb.find({ isDeleted: { $ne: true }, slug: { $ne: 'home' } }, { sort: { position: 1 } });
            return {
                data: encrypt({
                    success: true,
                    data: pages.map(p => ({
                        ...p,
                        _id: p._id ? p._id.toString() : undefined,
                        parentId: p.parentId ? p.parentId.toString() : null
                    }))
                })
            };
        } catch (error) {
            logger.error(`[NavigationController:getFlatPages] Error occurred:`, error);
            throw error;
        }
    }

    @Get("/allInOne")
    async getAllInOne() {
        try {
            const navQb = new QueryBuilder<Navigation>("navigations");
            const courseQb = new QueryBuilder<Course>("courses");

            const pages = await navQb.find({ isDeleted: { $ne: true } });
            const courses = await courseQb.find({ isDeleted: { $ne: true } });

            const combined = [
                ...pages.map(p => ({
                    name: p.pageName,
                    slug: p.slug,
                    type: 'page'
                })),
                ...courses.map(c => ({
                    name: c.title,
                    slug: c.slug,
                    type: 'course'
                }))
            ];

            return {
                data: encrypt({
                    success: true,
                    data: combined
                })
            };
        } catch (error) {
            logger.error(`[NavigationController:getAllInOne] Error occurred:`, error);
            throw error;
        }
    }

    // @Post("/")
    // async createPage(@Body() body: any) {
    //     try {
    //         const decryptedBody = decrypt(body.data);
    //         const db = getDB();

    //         const { slug, pageName, componentName, parentId, position } = decryptedBody;

    //         // Check if slug exists
    //         const existingPage = await db.collection("navigations").findOne({ slug });
    //         if (existingPage) {
    //             throw new HttpError(400, "Slug already exists");
    //         }

    //         let parsedParentId = null;
    //         if (parentId && parentId !== "null" && parentId !== "undefined" && parentId !== "") {
    //             if (typeof parentId === 'object' && parentId.buffer && parentId.buffer.data) {
    //                 parsedParentId = new ObjectId(Buffer.from(parentId.buffer.data));
    //             } else if (ObjectId.isValid(parentId)) {
    //                 parsedParentId = new ObjectId(parentId);
    //             } else {
    //                 throw new HttpError(400, `Invalid parentId format. Value received: ${JSON.stringify(parentId)} (type: ${typeof parentId})`);
    //             }
    //         }

    //         const newNavigation: Navigation = {
    //             slug,
    //             pageName,
    //             componentName,
    //             parentId: parsedParentId,
    //             position: position || 0,
    //             createdAt: new Date(),
    //             updatedAt: new Date()
    //         };

    //         const result = await db.collection("navigations").insertOne(newNavigation);

    //         return {
    //             data: encrypt({
    //                 success: true,
    //                 data: { ...newNavigation, _id: result.insertedId }
    //             })
    //         };
    //     } catch (error) {
    //         logger.error(`[NavigationController:createPage] Error occurred:`, error);
    //         throw error;
    //     }
    // }

    @Put("/reorder")
    async reorderPages(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);
            const qb = new QueryBuilder<Navigation>("navigations");
            const { items } = decryptedBody;

            if (!items || !Array.isArray(items)) {
                throw new HttpError(400, "Invalid items format");
            }

            const bulkOps = items.map((item: any) => {
                let parsedItemParentId = null;
                if (item.parentId && item.parentId !== "null" && item.parentId !== "undefined" && item.parentId !== "") {
                    if (typeof item.parentId === 'object' && item.parentId.buffer && item.parentId.buffer.data) {
                        parsedItemParentId = new ObjectId(Buffer.from(item.parentId.buffer.data));
                    } else if (ObjectId.isValid(item.parentId)) {
                        parsedItemParentId = new ObjectId(item.parentId);
                    } else {
                        throw new HttpError(400, `Invalid parentId format for item ${item.id}`);
                    }
                }

                return {
                    updateOne: {
                        filter: { _id: new ObjectId(item.id), isDeleted: { $ne: true } },
                        update: {
                            $set: {
                                parentId: parsedItemParentId,
                                position: item.position,
                                updatedAt: new Date()
                            }
                        }
                    }
                };
            });

            if (bulkOps.length > 0) {
                await qb.bulkWrite(bulkOps);
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Pages reordered successfully"
                })
            };
        } catch (error) {
            logger.error(`[NavigationController:reorderPages] Error occurred:`, error);
            throw error;
        }
    }

    @Put("/update/:id")
    async updatePage(@Param("id") id: string, @Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);
            const qb = new QueryBuilder<Navigation>("navigations");
            const { slug, pageName, componentName, parentId } = decryptedBody;

            if (slug) {
                const existingPage = await qb.findOne({ slug, _id: { $ne: new ObjectId(id) }, isDeleted: { $ne: true } });
                if (existingPage) {
                    throw new HttpError(400, "Slug already exists");
                }
            }

            const updateData: any = { updatedAt: new Date() };
            if (slug) updateData.slug = slug;
            if (pageName) updateData.pageName = pageName;
            if (componentName) updateData.componentName = componentName;

            if (parentId !== undefined) {
                let parsedParentId = null;
                if (parentId && parentId !== "null" && parentId !== "undefined" && parentId !== "") {
                    if (typeof parentId === 'object' && parentId.buffer && parentId.buffer.data) {
                        parsedParentId = new ObjectId(Buffer.from(parentId.buffer.data));
                    } else if (ObjectId.isValid(parentId)) {
                        parsedParentId = new ObjectId(parentId);
                    } else {
                        throw new HttpError(400, "Invalid parentId format. Must be a valid ObjectId.");
                    }
                }
                updateData.parentId = parsedParentId;
            }

            await qb.updateOne({ _id: new ObjectId(id), isDeleted: { $ne: true } }, updateData);
            const result = await qb.findOne({ _id: new ObjectId(id), isDeleted: { $ne: true } });

            if (!result) {
                throw new HttpError(404, "Page not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: result
                })
            };
        } catch (error) {
            logger.error(`[NavigationController:updatePage] Error occurred:`, error);
            throw error;
        }
    }

    @Delete("/delete/:id")
    async deletePage(@Param("id") id: string) {
        try {
            const qb = new QueryBuilder<Navigation>("navigations");

            const deleteChildren = async (parentId: ObjectId) => {
                const children = await qb.find({ parentId, isDeleted: { $ne: true } });
                for (const child of children) {
                    if (child._id) {
                        await deleteChildren(child._id as ObjectId);
                        await qb.updateOne({ _id: child._id, isDeleted: { $ne: true } }, { $set: { isDeleted: true, updatedAt: new Date() } });
                    }
                }
            };

            const pageId = new ObjectId(id);
            await deleteChildren(pageId);

            const result = await qb.updateOne(
                { _id: pageId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );
            if (!result || result.matchedCount === 0) {
                throw new HttpError(404, "Page not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Page deleted successfully"
                })
            };
        } catch (error) {
            logger.error(`[NavigationController:deletePage] Error occurred:`, error);
            throw error;
        }
    }
}
