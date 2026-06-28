import { JsonController, Get, Put, Body, UseBefore, Param } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";

@JsonController("/cms-pages")
@UseBefore(AdminMiddleware)
export class CMSPageController {

    @Get("/")
    async getPages() {
        try {
            const qb = new QueryBuilder<any>("page_cms_data");

            // Only fetch page, createdAt, and updatedAt from the database
            const pages = await qb.find({}, {
                projection: {
                    page: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    created_at: 1,
                    updated_at: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: pages.map((p: any) => ({
                        _id: p._id?.toString(),
                        page: p.page,
                        created_at: p.createdAt || p.created_at || null,
                        updated_at: p.updatedAt || p.updated_at || null
                    }))
                })
            };
        } catch (error) {
            logger.error(`[CMSPageController:getPages] Error occurred:`, error);
            throw error;
        }
    }

    @Get("/page-data/:id")
    async getPageById(@Param("id") id: string) {
        try {
            const qb = new QueryBuilder<any>("page_cms_data");

            const page = await qb.findById(id);

            if (!page) {
                return {
                    success: false,
                    message: "Page not found"
                };
            }

            // Convert _id to string for the response
            const formattedPage = {
                ...page,
                _id: page._id?.toString(),
            };

            return {
                data: encrypt({
                    success: true,
                    data: formattedPage
                })
            };
        } catch (error) {
            logger.error(`[CMSPageController:getPageById] Error occurred:`, error);
            throw error;
        }
    }

    @Put("/update/:id")
    async updatePageById(@Param("id") id: string, @Body() body: any) {
        try {
            const qb = new QueryBuilder<any>("page_cms_data");

            // Decrypt incoming payload
            const decryptedBody = decrypt(body.data);

            if (!decryptedBody) {
                return {
                    success: false,
                    message: "Invalid or empty payload"
                };
            }

            // Extract the fields to update and update timestamp
            const { _id, createdAt, updatedAt, created_at, updated_at, ...updateFields } = decryptedBody;
            updateFields.updatedAt = new Date();

            const result = await qb.updateById(id, { $set: updateFields });

            if (result.matchedCount === 0) {
                return {
                    success: false,
                    message: "Page not found"
                };
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Page updated successfully"
                })
            };
        } catch (error) {
            logger.error(`[CMSPageController:updatePageById] Error occurred:`, error);
            throw error;
        }
    }
}
