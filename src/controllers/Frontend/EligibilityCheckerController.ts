import { JsonController, Post, Body, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { EligibilityChecker } from "../../models/EligibilityChecker";
import { FormSendEmailToUser } from "../../models/FormSendEmailToUser";
import { Smtp } from "../../models/Smtp";
import { sendEmail } from "../../utils/mailer";

@JsonController("/frontend/eligibility-checker")
export class FrontendEligibilityCheckerController {

    @Post("/")
    async addEligibilityCheckerRoot(@Body() body: any) {
        return this.addEligibilityChecker(body);
    }

    @Post("/add")
    async addEligibilityChecker(@Body() body: any) {
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

            const eligibilityCheckerData: EligibilityChecker = {
                residencyStatus: decryptedBody.residencyStatus ? String(decryptedBody.residencyStatus).trim() : undefined,
                studiedBefore: decryptedBody.studiedBefore ? String(decryptedBody.studiedBefore).trim() : undefined,
                study: decryptedBody.study ? String(decryptedBody.study).trim() : undefined,
                household: decryptedBody.household ? String(decryptedBody.household).trim() : undefined,
                firstName: decryptedBody.firstName ? String(decryptedBody.firstName).trim() : undefined,
                email: decryptedBody.email ? String(decryptedBody.email).trim() : undefined,
                phone: decryptedBody.phone ? String(decryptedBody.phone).trim() : undefined,
                bestTimeToCall: decryptedBody.bestTimeToCall ? String(decryptedBody.bestTimeToCall).trim() : undefined,
                is_agree: decryptedBody.is_agree !== undefined ? Boolean(decryptedBody.is_agree) : undefined,
                status: "pending",
                isNotificationSend: false,
                isNotificationSendToAdmin: false,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const eligibilityCheckerDB = new QueryBuilder<EligibilityChecker>("eligibility_checkers");
            const result = await eligibilityCheckerDB.insertOne(eligibilityCheckerData);
            const insertedId = result.insertedId;

            // Check if email sending is enabled for "Eligibility Checker" form
            try {
                const formSendEmailDB = new QueryBuilder<FormSendEmailToUser>("form_send_email_to_users");
                const rule = await formSendEmailDB.findOne({
                    formName: { $regex: /^Eligibility Checker$/i },
                    isDeleted: { $ne: true }
                });

                if (rule) {
                    // 1. Send email to user if sendEmail is true
                    if (rule.sendEmail === true && eligibilityCheckerData.email) {
                        try {
                            const recipientEmail = eligibilityCheckerData.email;
                            const subject = "Eligibility Checker Submission Received";
                            const greetingName = eligibilityCheckerData.firstName ? ` ${eligibilityCheckerData.firstName}` : "";
                            const textContent = `Hello${greetingName},\n\nThank you for submitting your Eligibility Checker form. We have successfully received your details.\n\nBest regards,\nTeam`;
                            const htmlContent = `
                                <p>Hello${greetingName},</p>
                                <p>Thank you for submitting your Eligibility Checker form. We have successfully received your details.</p>
                                <p>Best regards,<br/>Team</p>
                            `;

                            await sendEmail(recipientEmail, subject, textContent, htmlContent);

                            // After successfully sending email, update isNotificationSend to true
                            await eligibilityCheckerDB.updateOne(
                                { _id: insertedId },
                                { $set: { isNotificationSend: true, updatedAt: new Date() } }
                            );
                        } catch (userEmailError: any) {
                            logger.error(`[FrontendEligibilityCheckerController:addEligibilityChecker] Failed to send email to user:`, userEmailError);
                        }
                    }

                    // 2. Send email to admin if sendEmailToAdmin is true
                    if (rule.sendEmailToAdmin === true) {
                        try {
                            const smtpDB = new QueryBuilder<Smtp>("smtps");
                            const smtpRecord = await smtpDB.findOne({ isDeleted: { $ne: true }, status: true });

                            if (smtpRecord && smtpRecord.recipient_email) {
                                const recipientEmail = smtpRecord.recipient_email.trim();
                                const adminSubject = "New Eligibility Checker Submission";
                                const detailsTable = `
                                    <h2>New Eligibility Checker Submission</h2>
                                    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                                        <tr><td><strong>First Name</strong></td><td>${eligibilityCheckerData.firstName || "-"}</td></tr>
                                        <tr><td><strong>Email</strong></td><td>${eligibilityCheckerData.email || "-"}</td></tr>
                                        <tr><td><strong>Phone</strong></td><td>${eligibilityCheckerData.phone || "-"}</td></tr>
                                        <tr><td><strong>Residency Status</strong></td><td>${eligibilityCheckerData.residencyStatus || "-"}</td></tr>
                                        <tr><td><strong>Studied Before</strong></td><td>${eligibilityCheckerData.studiedBefore || "-"}</td></tr>
                                        <tr><td><strong>Study</strong></td><td>${eligibilityCheckerData.study || "-"}</td></tr>
                                        <tr><td><strong>Household</strong></td><td>${eligibilityCheckerData.household || "-"}</td></tr>
                                        <tr><td><strong>Best Time To Call</strong></td><td>${eligibilityCheckerData.bestTimeToCall || "-"}</td></tr>
                                        <tr><td><strong>Agreed</strong></td><td>${eligibilityCheckerData.is_agree !== undefined ? String(eligibilityCheckerData.is_agree) : "-"}</td></tr>
                                    </table>
                                `;
                                const adminText = `A new Eligibility Checker submission has been received from ${eligibilityCheckerData.firstName || "a user"} (${eligibilityCheckerData.email || "No email"}).`;

                                await sendEmail(recipientEmail, adminSubject, adminText, detailsTable);

                                // After successfully sending email to admin, update isNotificationSendToAdmin to true
                                await eligibilityCheckerDB.updateOne(
                                    { _id: insertedId },
                                    { $set: { isNotificationSendToAdmin: true, updatedAt: new Date() } }
                                );
                            } else {
                                logger.warn(`[FrontendEligibilityCheckerController:addEligibilityChecker] SMTP recipient_email not configured. Skipping admin email.`);
                            }
                        } catch (adminEmailError: any) {
                            logger.error(`[FrontendEligibilityCheckerController:addEligibilityChecker] Failed to send email to admin:`, adminEmailError);
                        }
                    }
                }
            } catch (ruleError: any) {
                logger.error(`[FrontendEligibilityCheckerController:addEligibilityChecker] Error checking form email rule:`, ruleError);
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Eligibility checker submitted successfully",
                    id: insertedId.toString()
                })
            };
        } catch (error: any) {
            logger.error(`[FrontendEligibilityCheckerController:addEligibilityChecker] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
