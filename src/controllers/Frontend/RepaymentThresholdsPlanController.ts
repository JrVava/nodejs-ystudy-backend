import { JsonController, Get, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt } from "../../utils/crypto";
import { RepaymentThresholdsPlan } from "../../models/RepaymentThresholdsPlan";

@JsonController("/frontend/repayment-thresholds-plans")
export class FrontendRepaymentThresholdsPlanController {

    @Get("/")
    async getActivePlan() {
        try {
            const planDB = new QueryBuilder<RepaymentThresholdsPlan>("repayment_thresholds_plans");

            // Fetch the single latest active plan
            const plans = await planDB.find(
                { status: true, isDeleted: { $ne: true } },
                { sort: { createdAt: -1 }, limit: 1 }
            );

            const plan = plans.length > 0 ? plans[0] : null;

            return {
                data: encrypt({
                    success: true,
                    data: plan ? {
                        _id: plan._id?.toString(),
                        columns: plan.columns,
                        rows: plan.rows,
                        status: plan.status,
                        createdAt: plan.createdAt,
                        updatedAt: plan.updatedAt
                    } : null
                })
            };
        } catch (error) {
            logger.error(`[FrontendRepaymentThresholdsPlanController:getActivePlan] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
