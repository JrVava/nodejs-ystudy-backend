import { JsonController, Post, Body, UseBefore, HttpError, Get, QueryParam, Param, Delete } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { encrypt, decrypt } from "../../utils/crypto";
import logger from "../../utils/logger";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import { Subject } from "../../models/Subject";
import { ObjectId } from "mongodb";

@JsonController("/subject")
@UseBefore(AdminMiddleware)
export class SubjectController {

    @Post("/add")
    async addSubject(@Body() body: any) {
        try {
            // Decrypt incoming payload
            const decryptedBody = decrypt(body.data);

            if (!decryptedBody.title) {
                throw new HttpError(400, "Title is required and cannot be empty");
            }

            const subjectDB = new QueryBuilder<Subject>("subjects");

            // Construct new subject object
            const newSubject: Subject = {
                title: decryptedBody.title,
                status: decryptedBody.status !== undefined ? decryptedBody.status : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await subjectDB.insertOne(newSubject);

            return {
                data: encrypt({
                    success: true,
                    message: "Subject added successfully",
                    subjectId: result.insertedId
                })
            };
        } catch (error: any) {
            logger.error(`[SubjectController:addSubject] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/pagination")
    async listSubjects(
        @QueryParam("page") page: number = 1,
        @QueryParam("limit") limit: number = 10
    ) {
        try {
            const subjectDB = new QueryBuilder<Subject>("subjects");

            const results = await subjectDB.paginate({ isDeleted: { $ne: true } }, Number(page), Number(limit), { createdAt: -1 });

            return {
                data: encrypt({
                    success: true,
                    total: results.total,
                    page: results.page,
                    totalPages: results.totalPages,
                    data: results.data.map(s => ({
                        _id: s._id?.toString(),
                        title: s.title,
                        status: s.status,
                        createdAt: s.createdAt,
                        updatedAt: s.updatedAt
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[SubjectController:listSubjects] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/list")
    async getAllSubjects() {
        try {
            const subjectDB = new QueryBuilder<Subject>("subjects");

            const subjects = await subjectDB.find({ status: true, isDeleted: { $ne: true } }, {
                projection: {
                    title: 1
                }
            });

            return {
                data: encrypt({
                    success: true,
                    data: subjects.map((s: any) => ({
                        _id: s._id?.toString(),
                        title: s.title,
                        status: s.status
                    }))
                })
            };
        } catch (error: any) {
            logger.error(`[SubjectController:getAllSubjects] Error occurred:`, error);
            if (error instanceof HttpError) {
                throw error;
            }
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Get("/edit/:id")
    async getSubjectById(@Param("id") id: string) {
        try {
            const subjectDB = new QueryBuilder<Subject>("subjects");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid subject ID format");
            }

            const subject = await subjectDB.findOne({ _id: objId, isDeleted: { $ne: true } });
            if (!subject) {
                throw new HttpError(404, "Subject not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: {
                        ...subject,
                        _id: subject._id?.toString()
                    }
                })
            };
        } catch (error: any) {
            logger.error(`[SubjectController:getSubjectById] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update/:id")
    async updateSubject(
        @Param("id") id: string,
        @Body() body: any
    ) {
        try {
            const decryptedBody = decrypt(body.data);
            const subjectDB = new QueryBuilder<Subject>("subjects");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid subject ID format");
            }

            const updateFields: any = { ...decryptedBody, updatedAt: new Date() };
            delete updateFields._id; // Prevent updating ID

            const result = await subjectDB.updateOne({ _id: objId, isDeleted: { $ne: true } }, { $set: updateFields });

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Subject not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Subject updated successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[SubjectController:updateSubject] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }

    @Delete("/delete/:id")
    async deleteSubject(@Param("id") id: string) {
        try {
            const subjectDB = new QueryBuilder<Subject>("subjects");

            let objId: ObjectId;
            try {
                objId = new ObjectId(id);
            } catch (e) {
                throw new HttpError(400, "Invalid subject ID format");
            }

            const result = await subjectDB.updateOne(
                { _id: objId, isDeleted: { $ne: true } },
                { $set: { isDeleted: true, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                throw new HttpError(404, "Subject not found");
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Subject deleted successfully"
                })
            };
        } catch (error: any) {
            logger.error(`[SubjectController:deleteSubject] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
