import { JsonController, Post, Get, Body, QueryParam, Param, HttpError, UseBefore } from "routing-controllers";
import { ObjectId } from "mongodb";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { TimeTable } from "../../models/TimeTable";

@JsonController("/time-tables")
@UseBefore(AdminMiddleware)
export class TimeTableController {

    @Post("/add")
    async addTimeTable(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);
            const timeTableDB = new QueryBuilder<TimeTable>("time_tables");

            // Validate required fields
            if (!decryptedBody.title || !decryptedBody.slug) {
                throw new HttpError(400, "title and slug are required fields");
            }

            // Enforce items as an array
            const itemsArr = Array.isArray(decryptedBody.items) ? decryptedBody.items.map((i: any) => ({
                type: i.type || "",
                mode: i.mode || ""
            })) : [];

            // Check if slug already exists and is not deleted
            const existing = await timeTableDB.findOne({ slug: decryptedBody.slug, isDeleted: { $ne: true } });
            if (existing) {
                throw new HttpError(400, "Time table with this slug already exists");
            }

            const newTimeTable: TimeTable = {
                badge: decryptedBody.badge,
                title: decryptedBody.title,
                description: decryptedBody.description,
                slug: decryptedBody.slug,
                items: itemsArr,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await timeTableDB.insertOne(newTimeTable);

            return {
                data: encrypt({
                    success: true,
                    message: "Time table created successfully",
                    timeTableId: result.insertedId
                })
            };
        } catch (error) {
            logger.error(`[TimeTableController:addTimeTable] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/pagination")
    async listTimeTables(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10,
        @QueryParam("field") field: string = "createdAt",
        @QueryParam("sort") sort: string = "desc",
        @QueryParam("search") search?: string
    ) {
        try {
            const timeTableDB = new QueryBuilder<TimeTable>("time_tables");

            const filter: any = { isDeleted: { $ne: true } };

            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: "i" } }
                ];
            }

            const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
            const sortOptions: any = { [field]: sortOrder };
            const results = await timeTableDB.paginate(filter, Number(page), Number(limit), sortOptions);

            return {
                success: true,
                ...results,
                data: results.data.map((t: TimeTable) => ({
                    _id: t._id?.toString(),
                    title: t.title,
                    createdAt: t.createdAt,
                    updatedAt: t.updatedAt
                }))
            };
        } catch (error) {
            logger.error(`[TimeTableController:listTimeTables] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getTimeTable(@Param("id") timeTableId: string) {
        try {
            const timeTableDB = new QueryBuilder<TimeTable>("time_tables");

            let objId: ObjectId;
            try {
                objId = new ObjectId(timeTableId);
            } catch (e) {
                throw new HttpError(400, "Invalid timeTableId format");
            }

            const timeTable = await timeTableDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!timeTable) {
                throw new HttpError(404, "Time table not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: { ...timeTable, _id: timeTable._id?.toString() }
                })
            };
        } catch (error) {
            logger.error(`[TimeTableController:getTimeTable] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateTimeTable(
        @Param("id") timeTableId: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const timeTableDB = new QueryBuilder<TimeTable>("time_tables");

            let objId: ObjectId;
            try {
                objId = new ObjectId(timeTableId);
            } catch (e) {
                throw new HttpError(400, "Invalid timeTableId format");
            }

            const updateFields: any = { ...decryptedBody, updatedAt: new Date() };
            delete updateFields._id; // Prevent updating ID

            // If updating slug, check for uniqueness among non-deleted records
            if (updateFields.slug) {
                const existing = await timeTableDB.findOne({ slug: updateFields.slug, _id: { $ne: objId }, isDeleted: { $ne: true } });
                if (existing) {
                    throw new HttpError(400, "Time table with this slug already exists");
                }
            }

            // If items are provided, map them
            if (updateFields.items !== undefined) {
                updateFields.items = Array.isArray(updateFields.items) ? updateFields.items.map((i: any) => ({
                    type: i.type || "",
                    mode: i.mode || ""
                })) : [];
            }

            const result = await timeTableDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Time table not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Time table updated successfully"
                })
            };
        } catch (error) {
            logger.error(`[TimeTableController:updateTimeTable] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Get("/listing")
    async listingTimeTables() {
        try {
            const timeTableDB = new QueryBuilder<TimeTable>("time_tables");

            const timeTables = await timeTableDB.find({ isDeleted: { $ne: true } }, {
                projection: { _id: 1, title: 1 }
            });

            return {
                data: encrypt({
                    success: true,
                    data: timeTables.map((t: TimeTable) => ({
                        _id: t._id?.toString(),
                        title: t.title
                    }))
                })
            };
        } catch (error) {
            logger.error(`[TimeTableController:listingTimeTables] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/delete/:id")
    async deleteTimeTable(@Param("id") timeTableId: string) {
        try {
            const timeTableDB = new QueryBuilder<TimeTable>("time_tables");

            let objId: ObjectId;
            try {
                objId = new ObjectId(timeTableId);
            } catch (e) {
                throw new HttpError(400, "Invalid timeTableId format");
            }

            const result = await timeTableDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Time table not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Time table deleted successfully"
                })
            };
        } catch (error) {
            logger.error(`[TimeTableController:deleteTimeTable] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
