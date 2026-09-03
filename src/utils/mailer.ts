import nodemailer from "nodemailer";
import { QueryBuilder } from "../database/QueryBuilder";
import { Smtp } from "../models/Smtp";
import logger from "./logger";

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
    try {
        const smtpDB = new QueryBuilder<Smtp>("smtps");
        const config = await smtpDB.findOne({ isDeleted: { $ne: true }, status: true });

        console.log("config", config)
        if (!config) {
            throw new Error("SMTP configuration not found or inactive");
        }
        console.log({
            host: config.host,
            port: config.port,
            secure: config.secure, // true for 465, false for other ports
            auth: {
                user: config.user,
                pass: config.password
            }
        })
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure, // true for 465, false for other ports
            auth: {
                user: config.user,
                pass: config.password
            }
        });

        const info = await transporter.sendMail({
            from: config.fromEmail || config.user,
            to,
            subject,
            text,
            html
        });

        return info;
    } catch (error) {
        logger.error(`[Mailer:sendEmail] Error occurred:`, error);
        throw error;
    }
};
