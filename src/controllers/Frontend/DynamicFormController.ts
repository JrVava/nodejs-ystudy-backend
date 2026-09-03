import { JsonController, Post, Body, HttpError, Req } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { DynamicForm } from "../../models/DynamicForm";
import { ApplicationForm } from "../../models/ApplicationForm";
import { sendEmail } from "../../utils/mailer";
import { config } from "../../config";

@JsonController("/frontend/dynamic-forms")
export class FrontendDynamicFormController {

    @Post("/config")
    async getFormConfig() {
        try {
            const dynamicFormDB = new QueryBuilder<DynamicForm>("dynamicForms");

            // Fetch the single active form
            const form = await dynamicFormDB.findOne({ isActive: true, isDeleted: { $ne: true } });

            if (!form) {
                throw new HttpError(404, "Dynamic form not found");
            }

            return {
                data: encrypt({
                    success: true,
                    data: {
                        _id: form._id?.toString(),
                        title: form.title,
                        fields: form.fields
                    }
                })
            };
        } catch (error) {
            logger.error(`[FrontendDynamicFormController:getFormConfig] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }

    @Post("/submit")
    async submitForm(@Body() body: any) {
        try {
            const decryptedBody = decrypt(body.data);
            const formData = decryptedBody?.formData;

            if (!formData) {
                throw new HttpError(400, "formData is required");
            }

            const dynamicFormDB = new QueryBuilder<DynamicForm>("dynamicForms");

            // Assume there's only one active form
            const form = await dynamicFormDB.findOne({ isActive: true, isDeleted: { $ne: true } });

            if (!form) {
                throw new HttpError(404, "Dynamic form not found or inactive");
            }

            // Store the submission
            const applicationFormDB = new QueryBuilder<ApplicationForm>("applicationForm");

            const newSubmission: ApplicationForm = {
                formData: formData,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await applicationFormDB.insertOne(newSubmission);

            const formTitle = form.title || "Complete one short form.";

            // Construct email template dynamically from formData
            let emailHtml = `<h2>${formTitle}</h2><table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse;">`;
            for (const [key, value] of Object.entries(formData)) {
                // Find the label from the dynamic form configuration
                const fieldConfig = form.fields.find(f => f.name === key);
                const label = fieldConfig ? fieldConfig.label : key;

                // Ensure value is formatted nicely
                const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                emailHtml += `<tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>${label}</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${displayValue}</td>
                </tr>`;
            }
            emailHtml += `</table>`;

            // Send email
            try {
                console.log("config.recipient_email_id", config.recipient_email_id)
                await sendEmail(
                    config.recipient_email_id as string,
                    formTitle,
                    `A new ${formTitle} submission has been received. Please view this email in an HTML compatible client.`,
                    emailHtml
                );
            } catch (emailError) {
                console.log("emailError", emailError)
                logger.error(`[FrontendDynamicFormController:submitForm] Failed to send email:`, emailError);
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Form submitted successfully"
                })
            };
        } catch (error) {
            logger.error(`[FrontendDynamicFormController:submitForm] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, "Internal server error");
        }
    }
}
