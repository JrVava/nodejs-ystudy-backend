import { JsonController, Post, Body, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { BecomeAnAdviser } from "../../models/BecomeAnAdviser";
import { FormSendEmailToUser } from "../../models/FormSendEmailToUser";
import { Smtp } from "../../models/Smtp";
import { sendEmail } from "../../utils/mailer";

@JsonController("/frontend/become-an-adviser")
export class FrontendBecomeAnAdviserController {

    @Post("/")
    async addBecomeAnAdviserRoot(@Body() body: any) {
        return this.addBecomeAnAdviser(body);
    }

    @Post("/add")
    async addBecomeAnAdviser(@Body() body: any) {
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

            const adviserData: BecomeAnAdviser = {
                fullName: decryptedBody.fullName ? String(decryptedBody.fullName).trim() : undefined,
                email: decryptedBody.email ? String(decryptedBody.email).trim() : undefined,
                phone: decryptedBody.phone ? String(decryptedBody.phone).trim() : undefined,
                bestDescription: decryptedBody.bestDescription ? String(decryptedBody.bestDescription).trim() : undefined,
                audienceEnquiry: decryptedBody.audienceEnquiry ? String(decryptedBody.audienceEnquiry).trim() : undefined,
                status: "pending",
                isNotificationSend: false,
                isNotificationSendToAdmin: false,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const adviserDB = new QueryBuilder<BecomeAnAdviser>("become_an_advisers");
            const result = await adviserDB.insertOne(adviserData);
            const insertedId = result.insertedId;

            // Check if email sending is enabled for "Become An Adviser" form
            try {
                const formSendEmailDB = new QueryBuilder<FormSendEmailToUser>("form_send_email_to_users");
                const rule = await formSendEmailDB.findOne({
                    formName: { $regex: /^Become An Adviser$/i },
                    isDeleted: { $ne: true }
                });

                if (rule) {
                    // 1. Send email to user if sendEmail is true
                    if (rule.sendEmail === true && adviserData.email) {
                        try {
                            const recipientEmail = adviserData.email;
                            const subject = "Become An Adviser Submission Received";
                            const greetingName = adviserData.fullName ? ` ${adviserData.fullName}` : "";
                            const textContent = `Hello${greetingName},\n\nThank you for submitting your Become An Adviser inquiry. We have successfully received your details.\n\nBest regards,\nTeam`;
                            const htmlContent = `
                                <p>Hello${greetingName},</p>
                                <p>Thank you for submitting your Become An Adviser inquiry. We have successfully received your details.</p>
                                <p>Best regards,<br/>Team</p>
                            `;

                            await sendEmail(recipientEmail, subject, textContent, htmlContent);

                            // After successfully sending email, update isNotificationSend to true
                            await adviserDB.updateOne(
                                { _id: insertedId },
                                { $set: { isNotificationSend: true, updatedAt: new Date() } }
                            );
                        } catch (userEmailError: any) {
                            logger.error(`[FrontendBecomeAnAdviserController:addBecomeAnAdviser] Failed to send email to user:`, userEmailError);
                        }
                    }

                    // 2. Send email to admin if sendEmailToAdmin is true
                    if (rule.sendEmailToAdmin === true) {
                        try {
                            const smtpDB = new QueryBuilder<Smtp>("smtps");
                            const smtpRecord = await smtpDB.findOne({ isDeleted: { $ne: true }, status: true });

                            if (smtpRecord && smtpRecord.recipient_email) {
                                const recipientEmail = smtpRecord.recipient_email.trim();
                                const adminSubject = "New Become An Adviser Submission";
                                const detailsTable = `
                                    <h2>New Become An Adviser Submission</h2>
                                    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                                        <tr><td><strong>Full Name</strong></td><td>${adviserData.fullName || "-"}</td></tr>
                                        <tr><td><strong>Email</strong></td><td>${adviserData.email || "-"}</td></tr>
                                        <tr><td><strong>Phone</strong></td><td>${adviserData.phone || "-"}</td></tr>
                                        <tr><td><strong>Best Description</strong></td><td>${adviserData.bestDescription || "-"}</td></tr>
                                        <tr><td><strong>Audience Enquiry</strong></td><td>${adviserData.audienceEnquiry || "-"}</td></tr>
                                    </table>
                                `;
                                const adminText = `A new Become An Adviser submission has been received from ${adviserData.fullName || "a user"} (${adviserData.email || "No email"}).`;

                                await sendEmail(recipientEmail, adminSubject, adminText, detailsTable);

                                // After successfully sending email to admin, update isNotificationSendToAdmin to true
                                await adviserDB.updateOne(
                                    { _id: insertedId },
                                    { $set: { isNotificationSendToAdmin: true, updatedAt: new Date() } }
                                );
                            } else {
                                logger.warn(`[FrontendBecomeAnAdviserController:addBecomeAnAdviser] SMTP recipient_email not configured. Skipping admin email.`);
                            }
                        } catch (adminEmailError: any) {
                            logger.error(`[FrontendBecomeAnAdviserController:addBecomeAnAdviser] Failed to send email to admin:`, adminEmailError);
                        }
                    }
                }
            } catch (ruleError: any) {
                logger.error(`[FrontendBecomeAnAdviserController:addBecomeAnAdviser] Error checking form email rule:`, ruleError);
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Become an adviser inquiry submitted successfully",
                    id: insertedId.toString()
                })
            };
        } catch (error: any) {
            logger.error(`[FrontendBecomeAnAdviserController:addBecomeAnAdviser] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
