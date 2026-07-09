import { JsonController, Post, Body, UseBefore, HttpError, Get, QueryParam, Param, Delete } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import { Funding } from "../../models/Funding";
import { ObjectId } from "mongodb";

@JsonController("/fundings")
@UseBefore(AdminMiddleware)
export class FundingController {

    @Post("/add")
    async addFunding(@Body() body: any) {
        try {
            // Decrypt incoming payload
            const decryptedBody = decrypt(body.data);

            if (!decryptedBody.title) {
                throw new HttpError(400, "Title is required and cannot be empty");
            }

            const fundingDB = new QueryBuilder<Funding>("fundings");

            // Construct new funding object
            const newFunding: Funding = {
                title: decryptedBody.title,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await fundingDB.insertOne(newFunding);

            return {
                data: encrypt({
                    success: true,
                    message: "Funding added successfully",
                    fundingId: result.insertedId
                })
            };
        } catch (error: any) {
            logger.error(`[FundingController:addFunding] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/pagination")
    async listFundings(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10
    ) {
        try {
            const fundingDB = new QueryBuilder<Funding>("fundings");

            const results = await fundingDB.paginate({ isDeleted: { $ne: true } }, Number(page), Number(limit), { createdAt: -1 });

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(f => ({
                        _id: f._id?.toString(),
                        title: f.title,
                        status: f.status,
                        createdAt: f.createdAt,
                        updatedAt: f.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[FundingController:listFundings] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/list")
    async getAllFundings() {
        try {
            const fundingDB = new QueryBuilder<Funding>("fundings");

            const fundings = await fundingDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    title: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: fundings.map((f: any) => ({
                        _id: f._id?.toString(),
                        title: f.title,
                        status: f.status
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[FundingController:getAllFundings] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getFundingById(@Param("id") id: string) {
        try {
            const fundingDB = new QueryBuilder<Funding>("fundings");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid funding ID format");
            }

            const funding = await fundingDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!funding) {
                throw new HttpError(404, "Funding not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: {
                        ...funding,
                        _id: funding._id?.toString()
                    }
                })
            };
        } catch (error: any) {
            logger.error(`[FundingController:getFundingById] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateFunding(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const fundingDB = new QueryBuilder<Funding>("fundings");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid funding ID format");
            }

            const updateFields: any = { ...decryptedBody, updatedAt: new Date() };
            delete updateFields._id; // Prevent updating ID

            const result = await fundingDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Funding not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Funding updated successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[FundingController:updateFunding] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Delete("/delete/:id")
    async deleteFunding(@Param("id") id: string) {
        try {
            const fundingDB = new QueryBuilder<Funding>("fundings");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid funding ID format");
            }

            const result = await fundingDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Funding not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Funding deleted successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[FundingController:deleteFunding] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
