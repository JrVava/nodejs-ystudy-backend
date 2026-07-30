import { JsonController, Post, Get, Body, HttpError, UseBefore } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import { AdminMiddleware } from "../../middleware/AdminMiddleware";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { DynamicForm } from "../../models/DynamicForm";

@JsonController("/dynamic-forms")
@UseBefore(AdminMiddleware)
export class DynamicFormController {

    @Get("/")
    async getForm() {
        try {
            const dynamicFormDB = new QueryBuilder<DynamicForm>("dynamicForms");

            const form = await dynamicFormDB.findOne({ isDeleted: { $ne: true } });

            return {
                data: encrypt({
                    success: true,
                    data: form ? {
                        _id: form._id?.toString(),
                        title: form.title,
                        fields: form.fields,
                        isActive: form.isActive
                    } : null
                })
            };
        } catch (error) {
            logger.error(`[DynamicFormController:getForm] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/update")
    async updateForm(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);
            const dynamicFormDB = new QueryBuilder<DynamicForm>("dynamicForms");

            if (!decryptedBody.title || !Array.isArray(decryptedBody.fields)) {
                throw new HttpError(400, "title and fields array are required");
            }

            const existingForm = await dynamicFormDB.findOne({ isDeleted: { $ne: true } });

            if (existingForm) {
                const updateData: Partial<DynamicForm> = {
                    title: decryptedBody.title,
                    fields: decryptedBody.fields,
                    isActive: decryptedBody.isActive !== undefined ? decryptedBody.isActive : true,
                    updatedAt: new Date()
                };
                await dynamicFormDB.updateOne({ _id: existingForm._id }, { $set: updateData });
            } else {
                const newForm: DynamicForm = {
                    title: decryptedBody.title,
                    fields: decryptedBody.fields,
                    isActive: decryptedBody.isActive !== undefined ? decryptedBody.isActive : true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await dynamicFormDB.insertOne(newForm);
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Dynamic form updated successfully"
                })
            };
        } catch (error) {
            logger.error(`[DynamicFormController:updateForm] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
