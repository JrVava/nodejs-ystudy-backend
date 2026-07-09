import { JsonController, Get, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { Funding } from "../../models/Funding";

@JsonController("/frontend/fundings")
export class FrontendFundingController {

    @Get("/")
    async getAllFundings() {
        try {
            const fundingDB = new QueryBuilder<Funding>("fundings");

            // Find all active and non-deleted fundings
            const fundings = await fundingDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    title: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: fundings.map(f => ({
                        _id: f._id?.toString(),
                        title: f.title
                    }))
                })
            };
        } catch (error) {
            logger.error(`[FrontendFundingController:getAllFundings] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
