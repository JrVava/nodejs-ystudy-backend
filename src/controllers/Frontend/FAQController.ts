import { JsonController, Post, Body, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { decrypt, encrypt } from "../../utils/crypto";
import { FAQ } from "../../models/FAQ";

@JsonController("/frontend/faqs")
export class FrontendFAQController {

    @Post("/")
    async getFAQBySlug(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);
            const slug = decryptedBody?.slug;
            const faqDB = new QueryBuilder<FAQ>("faqs");

            // Find all active FAQs matching the slug
            const faqs = await faqDB.find({ slug, status: true });

            if (!faqs || faqs.length === 0) {
                throw new HttpError(404, "FAQ not found for the given slug");
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
                        }))
                    }
                })
            };
        } catch (error) {
            logger.error(`[FrontendFAQController:getFAQBySlug] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
