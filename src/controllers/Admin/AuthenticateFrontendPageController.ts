import { JsonController, Post, Get, Body, Param, QueryParam, HttpError, UseBefore } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { AuthenticateFrontendPage } from "../../models/AuthenticateFrontendPage";

@JsonController("/authenticate-frontend-pages")
@UseBefore(AdminMiddleware)
export class AuthenticateFrontendPageController {

    @Post("/")
    async createPage(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);
            const pageDB = new QueryBuilder<AuthenticateFrontendPage>("authenticate_frontend_pages");

            if (!decryptedBody.slug) {
                throw new HttpError(400, "Slug is required");
            }

            const existingPage = await pageDB.findOne({ slug: decryptedBody.slug, isDeleted: { $ne: true } });
            if (existingPage) {
                throw new HttpError(400, "Slug already exists");
            }

            const newPage: AuthenticateFrontendPage = {
                slug: decryptedBody.slug,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await pageDB.insertOne(newPage);

            return {
                data: encrypt({
                    success: true,
                    message: "Authenticate frontend page created successfully"
                })
            };
        } catch (error) {
            logger.error(`[AuthenticateFrontendPageController:createPage] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/pagination")
    async listPages(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const pageDB = new QueryBuilder<AuthenticateFrontendPage>("authenticate_frontend_pages");

            const filter: any = { isDeleted: { $ne: true } };

            if (search) {
                filter.$or = [
                    { slug: { $regex: search, $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await pageDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    ...results,
                    data: results.data.map((p: AuthenticateFrontendPage) => ({
                        _id: p._id?.toString(),
                        slug: p.slug,
                        status: p.status,
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt
                    }))
                })
            };
        } catch (error) {
            logger.error(`[AuthenticateFrontendPageController:listPages] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/edit/:slug")
    async getPageBySlug(@Param("slug") slug: string) {
        try {
            const pageDB = new QueryBuilder<AuthenticateFrontendPage>("authenticate_frontend_pages");

            const page = await pageDB.findOne({ slug, isDeleted: { $ne: true } });
            if (!page) {
                throw new HttpError(404, "Slug not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: {
                        _id: page._id?.toString(),
                        slug: page.slug,
                        status: page.status,
                        createdAt: page.createdAt,
                        updatedAt: page.updatedAt
                    }
                })
            };
        } catch (error) {
            logger.error(`[AuthenticateFrontendPageController:getPageBySlug] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:slug")
    async updatePage(
        @Param("slug") slug: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const pageDB = new QueryBuilder<AuthenticateFrontendPage>("authenticate_frontend_pages");

            const page = await pageDB.findOne({ slug, isDeleted: { $ne: true } });
            if (!page) {
                throw new HttpError(404, "Slug not found");
            }

            const updateData: any = {
                updatedAt: new Date()
            };

            if (decryptedBody.slug !== undefined) {
                // Check if new slug already exists
                if (decryptedBody.slug !== slug) {
                    const existingPage = await pageDB.findOne({ slug: decryptedBody.slug, isDeleted: { $ne: true } });
                    if (existingPage) {
                        throw new HttpError(400, "New slug already exists");
                    }
                }
                updateData.slug = decryptedBody.slug;
            }
            if (decryptedBody.status !== undefined) updateData.status = decryptedBody.status;

            await pageDB.updateOne(
                { slug, isDeleted: { $ne: true } },
                { $set: updateData }
            );

            return {
                data: encrypt({
                    success: true,
                    message: "Authenticate frontend page updated successfully"
                })
            };
        } catch (error) {
            logger.error(`[AuthenticateFrontendPageController:updatePage] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/delete/:slug")
    async deletePageBySlug(@Param("slug") slug: string) {
        try {
            const pageDB = new QueryBuilder<AuthenticateFrontendPage>("authenticate_frontend_pages");

            const page = await pageDB.findOne({ slug, isDeleted: { $ne: true } });
            if (!page) {
                throw new HttpError(404, "Slug not found");
            }

            await pageDB.updateOne(
                { slug, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            return {
                data: encrypt({
                    success: true,
                    message: "Authenticate frontend page deleted successfully"
                })
            };
        } catch (error) {
            logger.error(`[AuthenticateFrontendPageController:deletePageBySlug] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
