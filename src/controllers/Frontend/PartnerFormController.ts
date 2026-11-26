import { JsonController, Post, Body, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { PartnerForm } from "../../models/PartnerForm";
import { FormSendEmailToUser } from "../../models/FormSendEmailToUser";
import { Smtp } from "../../models/Smtp";
import { sendEmail } from "../../utils/mailer";

@JsonController("/frontend/partner-form")
export class FrontendPartnerFormController {

    @Post("/")
    async addPartnerFormRoot(@Body() body: any) {
        return this.addPartnerForm(body);
    }

    @Post("/add")
    async addPartnerForm(@Body() body: any) {
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

            const inputModule = decryptedBody.module || decryptedBody.formType || "becomeAnAdviser";
            const partnerFormData: PartnerForm = {
                module: inputModule ? String(inputModule).trim() : "becomeAnAdviser",
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

            const partnerFormDB = new QueryBuilder<PartnerForm>("partner_forms");
            const result = await partnerFormDB.insertOne(partnerFormData);
            const insertedId = result.insertedId;

            // Map module/form identifier to FormSendEmail formName
            const moduleToFormNameMap: Record<string, string> = {
                becomeanadviser: "Become An Adviser",
                become_an_adviser: "Become An Adviser",
                influencer: "Influencers",
                influencers: "Influencers",
                affiliatepartner: "Affiliate Partners",
                affiliatepartners: "Affiliate Partners",
                affiliate_partners: "Affiliate Partners",
                business: "Business",
                referafriend: "Refer A friend",
                refer_a_friend: "Refer A friend"
            };

            const normalizedKey = (partnerFormData.module || "becomeAnAdviser").toLowerCase().replace(/[\s-_]/g, "");
            const targetFormName = moduleToFormNameMap[normalizedKey] || partnerFormData.module || "Become An Adviser";

            // Check if email sending is enabled for this form module
            try {
                const formSendEmailDB = new QueryBuilder<FormSendEmailToUser>("form_send_email_to_users");
                const escapedFormName = targetFormName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const rule = await formSendEmailDB.findOne({
                    formName: { $regex: new RegExp(`^${escapedFormName}$`, "i") },
                    isDeleted: { $ne: true }
                });

                if (rule) {
                    // 1. Send email to user if sendEmail is true
                    if (rule.sendEmail === true && partnerFormData.email) {
                        try {
                            const recipientEmail = partnerFormData.email;
                            const subject = `${targetFormName} Submission Received`;
                            const greetingName = partnerFormData.fullName ? ` ${partnerFormData.fullName}` : "";
                            const textContent = `Hello${greetingName},\n\nThank you for submitting your ${targetFormName} inquiry. We have successfully received your details.\n\nBest regards,\nTeam`;
                            const htmlContent = `
                                <p>Hello${greetingName},</p>
                                <p>Thank you for submitting your ${targetFormName} inquiry. We have successfully received your details.</p>
                                <p>Best regards,<br/>Team</p>
                            `;

                            await sendEmail(recipientEmail, subject, textContent, htmlContent);

                            // After successfully sending email, update isNotificationSend to true
                            await partnerFormDB.updateOne(
                                { _id: insertedId },
                                { $set: { isNotificationSend: true, updatedAt: new Date() } }
                            );
                        } catch (userEmailError: any) {
                            logger.error(`[FrontendPartnerFormController:addPartnerForm] Failed to send email to user:`, userEmailError);
                        }
                    }

                    // 2. Send email to admin if sendEmailToAdmin is true
                    if (rule.sendEmailToAdmin === true) {
                        try {
                            const smtpDB = new QueryBuilder<Smtp>("smtps");
                            const smtpRecord = await smtpDB.findOne({ isDeleted: { $ne: true }, status: true });

                            if (smtpRecord && smtpRecord.recipient_email) {
                                const recipientEmail = smtpRecord.recipient_email.trim();
                                const adminSubject = `New ${targetFormName} Submission`;
                                const detailsTable = `
                                    <h2>New ${targetFormName} Submission</h2>
                                    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                                        <tr><td><strong>Module</strong></td><td>${targetFormName}</td></tr>
                                        <tr><td><strong>Full Name</strong></td><td>${partnerFormData.fullName || "-"}</td></tr>
                                        <tr><td><strong>Email</strong></td><td>${partnerFormData.email || "-"}</td></tr>
                                        <tr><td><strong>Phone</strong></td><td>${partnerFormData.phone || "-"}</td></tr>
                                        <tr><td><strong>Best Description</strong></td><td>${partnerFormData.bestDescription || "-"}</td></tr>
                                        <tr><td><strong>Audience Enquiry</strong></td><td>${partnerFormData.audienceEnquiry || "-"}</td></tr>
                                    </table>
                                `;
                                const adminText = `A new ${targetFormName} submission has been received from ${partnerFormData.fullName || "a user"} (${partnerFormData.email || "No email"}).`;

                                await sendEmail(recipientEmail, adminSubject, adminText, detailsTable);

                                // After successfully sending email to admin, update isNotificationSendToAdmin to true
                                await partnerFormDB.updateOne(
                                    { _id: insertedId },
                                    { $set: { isNotificationSendToAdmin: true, updatedAt: new Date() } }
                                );
                            } else {
                                logger.warn(`[FrontendPartnerFormController:addPartnerForm] SMTP recipient_email not configured. Skipping admin email.`);
                            }
                        } catch (adminEmailError: any) {
                            logger.error(`[FrontendPartnerFormController:addPartnerForm] Failed to send email to admin:`, adminEmailError);
                        }
                    }
                }
            } catch (ruleError: any) {
                logger.error(`[FrontendPartnerFormController:addPartnerForm] Error checking form email rule:`, ruleError);
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Partner form inquiry submitted successfully",
                    id: insertedId.toString()
                })
            };
        } catch (error: any) {
            logger.error(`[FrontendPartnerFormController:addPartnerForm] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}

// Aliases for /frontend/become-an-adviser and /frontend/partnerForm
@JsonController("/frontend/partnerForm")
export class FrontendPartnerFormCamelCaseController extends FrontendPartnerFormController { }

@JsonController("/frontend/become-an-adviser")
export class FrontendBecomeAnAdviserController extends FrontendPartnerFormController { }

@JsonController("/frontend/becomeAnAdviser")
export class FrontendBecomeAnAdviserCamelCaseController extends FrontendPartnerFormController { }
