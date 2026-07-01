import { JsonController, Get, Put, Body, UseBefore, Param, QueryParam, Req } from "routing-controllers";
import { getFullImageUrl, populateImages } from "../../utils/mediaUtils";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";

@JsonController("/cms-pages")
@UseBefore(AdminMiddleware)
export class CMSPageController {

    @Get("/")
    async getPages(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10
    ) {
        try {
            const qb = new QueryBuilder<any>("page_cms_data");

            const results = await qb.paginate({}, Number(page), Number(limit), { createdAt: -1 });

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map((p: any) => ({
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
    async getPageById(@Param("id") id: string, @Req() req: any) {
        try {
            const qb = new QueryBuilder<any>("page_cms_data");

            const page = await qb.findById(id);

            if (!page) {
                return {
                    success: false,
                    message: "Page not found"
                };
            }

            const populatedPage = await populateImages(page, req);

            // Convert _id to string for the response
            const formattedPage: any = {
                ...populatedPage,
                _id: page._id?.toString(),
            };

            // Sort keys to ensure section_* are ordered numerically
            const nonSectionKeys = Object.keys(formattedPage).filter(k => !k.startsWith('section_'));
            const sectionKeys = Object.keys(formattedPage).filter(k => k.startsWith('section_')).sort((a, b) => {
                const numA = parseInt(a.replace('section_', ''), 10);
                const numB = parseInt(b.replace('section_', ''), 10);
                return numA - numB;
            });

            const sortedPage: any = {};
            for (const key of nonSectionKeys) {
                sortedPage[key] = formattedPage[key];
            }
            for (const key of sectionKeys) {
                sortedPage[key] = formattedPage[key];
            }

            return {
                data: encrypt({
                    success: true,
                    data: sortedPage
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
