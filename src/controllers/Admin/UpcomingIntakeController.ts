import { JsonController, Post, Body, UseBefore, HttpError, Get, QueryParam, Param, Delete } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import { UpcomingIntake } from "../../models/UpcomingIntake";
import { ObjectId } from "mongodb";

@JsonController("/upcoming-intakes")
@UseBefore(AdminMiddleware)
export class UpcomingIntakeController {

    @Post("/add")
    async addUpcomingIntake(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);

            if (!decryptedBody.year) {
                throw new HttpError(400, "Year is required");
            }
            if (!decryptedBody.month) {
                throw new HttpError(400, "Month is required");
            }
            if (!decryptedBody.subjectId) {
                throw new HttpError(400, "subjectId is required");
            }
            if (!decryptedBody.qualificationId) {
                throw new HttpError(400, "qualificationId is required");
            }
            if (!decryptedBody.link) {
                throw new HttpError(400, "Link is required");
            }

            const intakeDB = new QueryBuilder<UpcomingIntake>("upcoming_intakes");

            const newIntake: UpcomingIntake = {
                year: decryptedBody.year,
                month: decryptedBody.month,
                subjectId: new ObjectId(decryptedBody.subjectId),
                qualificationId: new ObjectId(decryptedBody.qualificationId),
                link: decryptedBody.link,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await intakeDB.insertOne(newIntake);

            return {
                data: encrypt({
                    success: true,
                    message: "Upcoming intake added successfully",
                    intakeId: result.insertedId
                })
            };
        } catch (error: any) {
            logger.error(`[UpcomingIntakeController:addUpcomingIntake] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/pagination")
    async listUpcomingIntakes(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const intakeDB = new QueryBuilder<UpcomingIntake>("upcoming_intakes");

            const filter: any = { isDeleted: { $ne: true } };

            if (search) {
                filter.$or = [
                    { year: { $regex: search, $options: "i" } },
                    { month: { $regex: search, $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await intakeDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(s => ({
                        _id: s._id?.toString(),
                        year: s.year,
                        month: s.month,
                        subjectId: s.subjectId?.toString(),
                        qualificationId: s.qualificationId?.toString(),
                        link: s.link,
                        status: s.status,
                        createdAt: s.createdAt,
                        updatedAt: s.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[UpcomingIntakeController:listUpcomingIntakes] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/list")
    async getAllUpcomingIntakes() {
        try {
            const intakeDB = new QueryBuilder<UpcomingIntake>("upcoming_intakes");

            const intakes = await intakeDB.find({ status: true, isDeleted: { $ne: true } });

            return {
                data: encrypt({
                    success: true,
                    data: intakes.map((s: any) => ({
                        _id: s._id?.toString(),
                        year: s.year,
                        month: s.month,
                        subjectId: s.subjectId?.toString(),
                        qualificationId: s.qualificationId?.toString(),
                        link: s.link,
                        status: s.status
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[UpcomingIntakeController:getAllUpcomingIntakes] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getUpcomingIntakeById(@Param("id") id: string) {
        try {
            const intakeDB = new QueryBuilder<UpcomingIntake>("upcoming_intakes");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid upcoming intake ID format");
            }

            const intake = await intakeDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!intake) {
                throw new HttpError(404, "Upcoming intake not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: {
                        ...intake,
                        _id: intake._id?.toString(),
                        subjectId: intake.subjectId?.toString(),
                        qualificationId: intake.qualificationId?.toString()
                    }
                })
            };
        } catch (error: any) {
            logger.error(`[UpcomingIntakeController:getUpcomingIntakeById] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateUpcomingIntake(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const intakeDB = new QueryBuilder<UpcomingIntake>("upcoming_intakes");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid upcoming intake ID format");
            }

            const updateFields: any = { ...decryptedBody, updatedAt: new Date() };
            delete updateFields._id; // Prevent updating ID

            if (updateFields.subjectId) {
                updateFields.subjectId = new ObjectId(updateFields.subjectId);
            }
            if (updateFields.qualificationId) {
                updateFields.qualificationId = new ObjectId(updateFields.qualificationId);
            }

            const result = await intakeDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Upcoming intake not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Upcoming intake updated successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[UpcomingIntakeController:updateUpcomingIntake] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Delete("/delete/:id")
    async deleteUpcomingIntake(@Param("id") id: string) {
        try {
            const intakeDB = new QueryBuilder<UpcomingIntake>("upcoming_intakes");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid upcoming intake ID format");
            }

            const result = await intakeDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Upcoming intake not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Upcoming intake deleted successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[UpcomingIntakeController:deleteUpcomingIntake] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
