import { JsonController, Post, Body, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { AdviserCall } from "../../models/AdviserCall";
import { FormSendEmailToUser } from "../../models/FormSendEmailToUser";
import { Smtp } from "../../models/Smtp";
import { sendEmail } from "../../utils/mailer";

@JsonController("/frontend/adviser-call")
export class FrontendAdviserCallController {

    @Post("/")
    async addAdviserCallRoot(@Body() body: any) {
        return this.addAdviserCall(body);
    }

    @Post("/add")
    async addAdviserCall(@Body() body: any) {
        try {
            let decryptedBody: any = body;
            if (body && body.data) {
                try {
                    decryptedBody = decrypt(body.data);
                } catch {
                    decryptedBody = body;
                }
            }

            if (!decryptedBody) {
                throw new HttpError(400, "Request body is required");
            }

            const adviserCallData: AdviserCall = {
                name: decryptedBody.name ? String(decryptedBody.name).trim() : undefined,
                email: decryptedBody.email ? String(decryptedBody.email).trim() : undefined,
                phone: decryptedBody.phone ? String(decryptedBody.phone).trim() : undefined,
                contactMethod: decryptedBody.contactMethod ? String(decryptedBody.contactMethod).trim() : undefined,
                topic: decryptedBody.topic ? String(decryptedBody.topic).trim() : undefined,
                preferredDay: decryptedBody.preferredDay ? String(decryptedBody.preferredDay).trim() : undefined,
                preferredTimeSlot: decryptedBody.preferredTimeSlot ? String(decryptedBody.preferredTimeSlot).trim() : undefined,
                discuss: decryptedBody.discuss ? String(decryptedBody.discuss).trim() : undefined,
                is_agree: decryptedBody.is_agree !== undefined ? Boolean(decryptedBody.is_agree) : undefined,
                status: "pending",
                isNotificationSend: false,
                isNotificationSendToAdmin: false,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const adviserCallDB = new QueryBuilder<AdviserCall>("adviser_calls");
            const result = await adviserCallDB.insertOne(adviserCallData);
            const insertedId = result.insertedId;

            // Check if email sending is enabled in form_send_email_to_users for "Adviser Lead"
            try {
                const formSendEmailDB = new QueryBuilder<FormSendEmailToUser>("form_send_email_to_users");
                const rule = await formSendEmailDB.findOne({
                    formName: { $regex: /^Adviser Lead$/i },
                    isDeleted: { $ne: true }
                });

                if (rule) {
                    // 1. Send email to user if sendEmail is true
                    if (rule.sendEmail === true && adviserCallData.email) {
                        try {
                            const recipientEmail = adviserCallData.email;
                            const subject = "Adviser Call Request Received";
                            const greetingName = adviserCallData.name ? ` ${adviserCallData.name}` : "";
                            const textContent = `Hello${greetingName},\n\nThank you for requesting an adviser call. We have successfully received your details.\n\nBest regards,\nTeam`;
                            const htmlContent = `
                                <p>Hello${greetingName},</p>
                                <p>Thank you for requesting an adviser call. We have successfully received your details.</p>
                                <p>Best regards,<br/>Team</p>
                            `;

                            await sendEmail(recipientEmail, subject, textContent, htmlContent);

                            // After successfully sending email, update isNotificationSend to true
                            await adviserCallDB.updateOne(
                                { _id: insertedId },
                                { $set: { isNotificationSend: true, updatedAt: new Date() } }
                            );
                        } catch (userEmailError: any) {
                            logger.error(`[FrontendAdviserCallController:addAdviserCall] Failed to send email to user:`, userEmailError);
                        }
                    }

                    // 2. Send email to admin if sendEmailToAdmin is true
                    if (rule.sendEmailToAdmin === true) {
                        try {
                            const smtpDB = new QueryBuilder<Smtp>("smtps");
                            const smtpRecord = await smtpDB.findOne({ isDeleted: { $ne: true }, status: true });

                            if (smtpRecord && smtpRecord.recipient_email) {
                                const recipientEmail = smtpRecord.recipient_email.trim();
                                const adminSubject = "New Adviser Call Request";
                                const detailsTable = `
                                    <h2>New Adviser Call Request</h2>
                                    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                                        <tr><td><strong>Name</strong></td><td>${adviserCallData.name || "-"}</td></tr>
                                        <tr><td><strong>Email</strong></td><td>${adviserCallData.email || "-"}</td></tr>
                                        <tr><td><strong>Phone</strong></td><td>${adviserCallData.phone || "-"}</td></tr>
                                        <tr><td><strong>Contact Method</strong></td><td>${adviserCallData.contactMethod || "-"}</td></tr>
                                        <tr><td><strong>Topic</strong></td><td>${adviserCallData.topic || "-"}</td></tr>
                                        <tr><td><strong>Preferred Day</strong></td><td>${adviserCallData.preferredDay || "-"}</td></tr>
                                        <tr><td><strong>Preferred Time Slot</strong></td><td>${adviserCallData.preferredTimeSlot || "-"}</td></tr>
                                        <tr><td><strong>Discuss</strong></td><td>${adviserCallData.discuss || "-"}</td></tr>
                                        <tr><td><strong>Agreed</strong></td><td>${adviserCallData.is_agree !== undefined ? String(adviserCallData.is_agree) : "-"}</td></tr>
                                    </table>
                                `;
                                const adminText = `A new Adviser Call request has been received from ${adviserCallData.name || "a user"} (${adviserCallData.email || "No email"}).`;

                                await sendEmail(recipientEmail, adminSubject, adminText, detailsTable);

                                // After successfully sending email to admin, update isNotificationSendToAdmin to true
                                await adviserCallDB.updateOne(
                                    { _id: insertedId },
                                    { $set: { isNotificationSendToAdmin: true, updatedAt: new Date() } }
                                );
                            } else {
                                logger.warn(`[FrontendAdviserCallController:addAdviserCall] SMTP recipient_email not configured. Skipping admin email.`);
                            }
                        } catch (adminEmailError: any) {
                            logger.error(`[FrontendAdviserCallController:addAdviserCall] Failed to send email to admin:`, adminEmailError);
                        }
                    }
                }
            } catch (ruleError: any) {
                logger.error(`[FrontendAdviserCallController:addAdviserCall] Error checking form email rule:`, ruleError);
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Adviser call request submitted successfully",
                    id: insertedId.toString()
                })
            };
        } catch (error: any) {
            logger.error(`[FrontendAdviserCallController:addAdviserCall] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}

// Aliases for /frontend/adviserCall
@JsonController("/frontend/adviserCall")
export class FrontendAdviserCallCamelCaseController extends FrontendAdviserCallController { }
