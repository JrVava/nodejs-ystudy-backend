import { JsonController, Post, Body, HttpError } from "routing-controllers";
import { QueryBuilder } from "../../database/QueryBuilder";
import logger from "../../utils/logger";
import { encrypt, decrypt } from "../../utils/crypto";
import { DegreeMatch } from "../../models/DegreeMatch";
import { FormSendEmailToUser } from "../../models/FormSendEmailToUser";
import { Smtp } from "../../models/Smtp";
import { sendEmail } from "../../utils/mailer";

@JsonController("/frontend/degree-match")
export class FrontendDegreeMatchController {

    @Post("/")
    async addDegreeMatchRoot(@Body() body: any) {
        return this.addDegreeMatch(body);
    }

    @Post("/add")
    async addDegreeMatch(@Body() body: any) {
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

            const degreeMatchData: DegreeMatch = {
                residencyStatus: decryptedBody.residencyStatus ? String(decryptedBody.residencyStatus).trim() : undefined,
                highestQualification: decryptedBody.highestQualification ? String(decryptedBody.highestQualification).trim() : undefined,
                subjectsInterest: decryptedBody.subjectsInterest ? String(decryptedBody.subjectsInterest).trim() : undefined,
                study: decryptedBody.study ? String(decryptedBody.study).trim() : undefined,
                salaryLevel: decryptedBody.salaryLevel ? String(decryptedBody.salaryLevel).trim() : undefined,
                situation: decryptedBody.situation ? String(decryptedBody.situation).trim() : undefined,
                ageRange: decryptedBody.ageRange ? String(decryptedBody.ageRange).trim() : undefined,
                languageConfident: decryptedBody.languageConfident ? String(decryptedBody.languageConfident).trim() : undefined,
                HouseholdIncome: decryptedBody.HouseholdIncome ? String(decryptedBody.HouseholdIncome).trim() : undefined,
                career: decryptedBody.career ? String(decryptedBody.career).trim() : undefined,
                responsibilities: decryptedBody.responsibilities ? String(decryptedBody.responsibilities).trim() : undefined,
                firstName: decryptedBody.firstName ? String(decryptedBody.firstName).trim() : undefined,
                email: decryptedBody.email ? String(decryptedBody.email).trim() : undefined,
                phone: decryptedBody.phone ? String(decryptedBody.phone).trim() : undefined,
                bestTimeToCall: decryptedBody.bestTimeToCall ? String(decryptedBody.bestTimeToCall).trim() : undefined,
                is_agree: decryptedBody.is_agree !== undefined ? Boolean(decryptedBody.is_agree) : undefined,
                status: "pending",
                is_notification_send: false,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const degreeMatchDB = new QueryBuilder<DegreeMatch>("degree_matches");
            const result = await degreeMatchDB.insertOne(degreeMatchData);
            const insertedId = result.insertedId;

            // Check if email sending is enabled for "Degree Match" form
            try {
                const formSendEmailDB = new QueryBuilder<FormSendEmailToUser>("form_send_email_to_users");
                const rule = await formSendEmailDB.findOne({
                    formName: { $regex: /^Degree Match$/i },
                    isDeleted: { $ne: true }
                });

                if (rule) {
                    // 1. Send email to user if sendEmail is true
                    if (rule.sendEmail === true && degreeMatchData.email) {
                        try {
                            const recipientEmail = degreeMatchData.email;
                            const subject = "Degree Match Submission Received";
                            const greetingName = degreeMatchData.firstName ? ` ${degreeMatchData.firstName}` : "";
                            const textContent = `Hello${greetingName},\n\nThank you for submitting your Degree Match form. We have successfully received your details.\n\nBest regards,\nTeam`;
                            const htmlContent = `
                                <p>Hello${greetingName},</p>
                                <p>Thank you for submitting your Degree Match form. We have successfully received your details.</p>
                                <p>Best regards,<br/>Team</p>
                            `;

                            await sendEmail(recipientEmail, subject, textContent, htmlContent);

                            // After successfully sending email, update is_notification_send to true
                            await degreeMatchDB.updateOne(
                                { _id: insertedId },
                                { $set: { is_notification_send: true, updatedAt: new Date() } }
                            );
                        } catch (userEmailError: any) {
                            logger.error(`[FrontendDegreeMatchController:addDegreeMatch] Failed to send email to user:`, userEmailError);
                        }
                    }

                    // 2. Send email to admin if sendEmailToAdmin is true
                    if (rule.sendEmailToAdmin === true) {
                        try {
                            const smtpDB = new QueryBuilder<Smtp>("smtps");
                            const smtpRecord = await smtpDB.findOne({ isDeleted: { $ne: true }, status: true });

                            if (smtpRecord && smtpRecord.recipient_email) {
                                const adminEmails = smtpRecord.recipient_email
                                    .split(",")
                                    .map(e => e.trim().replace(/[\s.]+$/, ''))
                                    .filter(e => e.length > 0);

                                if (adminEmails.length > 0) {
                                    const adminSubject = "New Degree Match Submission";
                                    const detailsTable = `
                                        <h2>New Degree Match Submission</h2>
                                        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                                            <tr><td><strong>First Name</strong></td><td>${degreeMatchData.firstName || "-"}</td></tr>
                                            <tr><td><strong>Email</strong></td><td>${degreeMatchData.email || "-"}</td></tr>
                                            <tr><td><strong>Phone</strong></td><td>${degreeMatchData.phone || "-"}</td></tr>
                                            <tr><td><strong>Residency Status</strong></td><td>${degreeMatchData.residencyStatus || "-"}</td></tr>
                                            <tr><td><strong>Highest Qualification</strong></td><td>${degreeMatchData.highestQualification || "-"}</td></tr>
                                            <tr><td><strong>Subjects of Interest</strong></td><td>${degreeMatchData.subjectsInterest || "-"}</td></tr>
                                            <tr><td><strong>Study</strong></td><td>${degreeMatchData.study || "-"}</td></tr>
                                            <tr><td><strong>Career</strong></td><td>${degreeMatchData.career || "-"}</td></tr>
                                            <tr><td><strong>Salary Level</strong></td><td>${degreeMatchData.salaryLevel || "-"}</td></tr>
                                            <tr><td><strong>Situation</strong></td><td>${degreeMatchData.situation || "-"}</td></tr>
                                            <tr><td><strong>Age Range</strong></td><td>${degreeMatchData.ageRange || "-"}</td></tr>
                                            <tr><td><strong>Language Confident</strong></td><td>${degreeMatchData.languageConfident || "-"}</td></tr>
                                            <tr><td><strong>Household Income</strong></td><td>${degreeMatchData.HouseholdIncome || "-"}</td></tr>
                                            <tr><td><strong>Responsibilities</strong></td><td>${degreeMatchData.responsibilities || "-"}</td></tr>
                                            <tr><td><strong>Best Time To Call</strong></td><td>${degreeMatchData.bestTimeToCall || "-"}</td></tr>
                                            <tr><td><strong>Agreed</strong></td><td>${degreeMatchData.is_agree !== undefined ? String(degreeMatchData.is_agree) : "-"}</td></tr>
                                        </table>
                                    `;
                                    const adminText = `A new Degree Match submission has been received from ${degreeMatchData.firstName || "a user"} (${degreeMatchData.email || "No email"}).`;

                                    for (const adminEmail of adminEmails) {
                                        await sendEmail(adminEmail, adminSubject, adminText, detailsTable);
                                    }
                                }
                            } else {
                                logger.warn(`[FrontendDegreeMatchController:addDegreeMatch] SMTP recipient_email not configured. Skipping admin email.`);
                            }
                        } catch (adminEmailError: any) {
                            logger.error(`[FrontendDegreeMatchController:addDegreeMatch] Failed to send email to admin:`, adminEmailError);
                        }
                    }
                }
            } catch (ruleError: any) {
                logger.error(`[FrontendDegreeMatchController:addDegreeMatch] Error checking form email rule:`, ruleError);
            }

            return {
                data: encrypt({
                    success: true,
                    message: "Degree match submitted successfully",
                    id: insertedId.toString()
                })
            };
        } catch (error: any) {
            logger.error(`[FrontendDegreeMatchController:addDegreeMatch] Error occurred:`, error);
            if (error instanceof HttpError) throw error;
            throw new HttpError(500, error.message || "Internal server error");
        }
    }
}
