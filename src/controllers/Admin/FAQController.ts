import { JsonController, Post, Get, Body, Param, QueryParam, HttpError, UseBefore } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { FAQ } from "../../models/FAQ";

@JsonController("/faqs")
@UseBefore(AdminMiddleware)
export class FAQController {

    @Post("/")
    async createFAQ(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);
            const faqDB = new QueryBuilder<FAQ>("faqs");

            if (!Array.isArray(decryptedBody.faqs)) {
                throw new HttpError(400, "faqs array is required in the payload");
            }

            const newFAQs: FAQ[] = decryptedBody.faqs.map((f: any) => ({
                slug: decryptedBody.slug,
                question: f.question,
                answer: f.answer,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            if (newFAQs.length > 0) {
                await faqDB.insertMany(newFAQs);
            }

            return {
                data: encrypt({
                    success: true,
                    message: "FAQs created successfully"
                })
            };
        } catch (error) {
            logger.error(`[FAQController:createFAQ] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/pagination")
    async listFAQs(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10
    ) {
        try {
            const faqDB = new QueryBuilder<FAQ>("faqs");

            const results = await faqDB.paginate({}, Number(page), Number(limit), { createdAt: -1 });

            return {
                success: true,
                ...results,
                data: results.data.map((f: FAQ) => ({
                    _id: f._id?.toString(),
                    slug: f.slug,
                    question: f.question,
                    createdAt: f.createdAt,
                    updatedAt: f.updatedAt
                }))
            };
        } catch (error) {
            logger.error(`[FAQController:listFAQs] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/edit/:slug")
    async getFAQBySlug(@Param("slug") slug: string) {
        try {
            const faqDB = new QueryBuilder<FAQ>("faqs");

            const faqs = await faqDB.find({ slug });
            if (!faqs || faqs.length === 0) {
                throw new HttpError(404, "FAQ slug not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: {
                        slug: slug,
                        faqs: faqs.map(f => ({
                            _id: f._id?.toString(),
                            question: f.question,
                            answer: f.answer,
                            status: f.status
                        }))
                    }
                })
            };
        } catch (error) {
            logger.error(`[FAQController:getFAQBySlug] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:slug")
    async updateFAQ(
        @Param("slug") slug: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const faqDB = new QueryBuilder<FAQ>("faqs");

            if (!Array.isArray(decryptedBody.faqs)) {
                throw new HttpError(400, "faqs array is required in the payload");
            }

            // First delete existing rows for this slug
            await faqDB.deleteMany({ slug } as any);

            // Re-insert new rows
            const updatedFAQs: FAQ[] = decryptedBody.faqs.map((f: any) => ({
                slug: slug, // Keep original param slug
                question: f.question,
                answer: f.answer,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            if (updatedFAQs.length > 0) {
                await faqDB.insertMany(updatedFAQs);
            }

            return {
                data: encrypt({
                    success: true,
                    message: "FAQs updated successfully"
                })
            };
        } catch (error) {
            logger.error(`[FAQController:updateFAQ] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/delete/:slug")
    async deleteFAQBySlug(@Param("slug") slug: string) {
        try {
            const faqDB = new QueryBuilder<FAQ>("faqs");

            const faqs = await faqDB.find({ slug });
            if (!faqs || faqs.length === 0) {
                throw new HttpError(404, "FAQ slug not found");
            }

            await faqDB.deleteMany({ slug } as any);

            return {
                data: encrypt({
                    success: true,
                    message: "FAQs deleted successfully"
                })
            };
        } catch (error) {
            logger.error(`[FAQController:deleteFAQBySlug] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
