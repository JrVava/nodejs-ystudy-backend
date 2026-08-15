import { JsonController, Post, Body, Res } from "routing-controllers";
import { Response } from "express";
import crypto from "crypto";
import { QueryBuilder } from "../../database/QueryBuilder";
import { hashPassword, comparePassword } from "../../utils/hash";
import { generateToken } from "../../utils/jwt";
import { decrypt, encrypt } from "../../utils/crypto";
import { config } from "../../config";
import logger from "../../utils/logger";
import { User } from "../../models/User";
import { sendEmail } from "../../utils/mailer";

@JsonController("/frontend/auth")
export class FrontendAuthController {

    @Post("/register")
    async register(@Body() body: any, @Res() res: Response) {
        try {
            const { name, email, password } = decrypt(body.data);
            if (!name || !email || !password) {
                return res.status(400).json({
                    data: encrypt({ success: false, message: "Name, email, and password are required" })
                });
            }

            const userDB = new QueryBuilder<User>("users");
            const existingUser = await userDB.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    data: encrypt({ success: false, message: "Email already exists" })
                });
            }

            const hashedPassword = await hashPassword(password);

            const newUser: User = {
                name,
                email,
                password: hashedPassword,
                role: "user",
                status: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await userDB.insertOne(newUser);

            return res.json({
                data: encrypt({
                    success: true,
                    message: "User registered successfully"
                })
            });
        } catch (error) {
            logger.error(`[FrontendAuthController:register] Error occurred:`, error);
            return res.status(500).json({
                data: encrypt({ success: false, message: "Internal server error" })
            });
        }
    }

    @Post("/login")
    async login(@Body() body: any, @Res() res: Response) {
        try {
            const { email, password } = decrypt(body.data);
            if (!email || !password) {
                return res.status(400).json({
                    data: encrypt({ success: false, message: "Email and password are required" })
                });
            }

            const userDB = new QueryBuilder<User>("users");
            const user = await userDB.findOne({ email, isDeleted: { $ne: true } });

            if (!user) {
                return res.status(400).json({
                    data: encrypt({ success: false, message: "User not found" })
                });
            }

            // We allow both admin and user roles to login through frontend if they want, 
            // but if we only want frontend users to login here, we can enforce:
            // if (user.role !== "user") { return error }
            // Given the flexibility, we check password first.

            if (!user.password) {
                return res.status(400).json({
                    data: encrypt({ success: false, message: "Invalid credentials" })
                });
            }

            const isMatch = await comparePassword(password, user.password);

            if (!isMatch) {
                return res.status(400).json({
                    data: encrypt({ success: false, message: "Invalid password" })
                });
            }

            if (user.status === false) {
                return res.status(403).json({
                    data: encrypt({ success: false, message: "Account is inactive" })
                });
            }

            const token = generateToken({
                id: user._id,
                role: user.role,
                email: user.email,
            });

            return res.json({
                data: encrypt({
                    success: true,
                    message: "Login successful",
                    token,
                    user: {
                        id: user._id?.toString(),
                        name: user.name,
                        email: user.email,
                        role: user.role,
                    },
                    idleTimeoutMs: config.idleTimeoutMs,
                    expiresInMs: config.jwtExpiresInMs,
                }),
            });
        } catch (error) {
            logger.error(`[FrontendAuthController:login] Error occurred:`, error);
            return res.status(500).json({
                data: encrypt({ success: false, message: "Internal server error" })
            });
        }
    }

    @Post("/logout")
    async logout(@Res() res: Response) {
        return res.json({
            data: encrypt({
                success: true,
                message: "Logout successful",
            }),
        });
    }

    @Post("/forgot-password")
    async forgotPassword(@Body() body: any, @Res() res: Response) {
        try {
            const { email } = decrypt(body.data);
            if (!email) {
                return res.status(400).json({
                    data: encrypt({ success: false, message: "Email is required" })
                });
            }

            const userDB = new QueryBuilder<User>("users");
            const user = await userDB.findOne({ email, isDeleted: { $ne: true } });

            if (!user) {
                // Return success even if user not found to prevent email enumeration
                return res.json({
                    data: encrypt({
                        success: true,
                        message: "If an account with that email exists, we have sent a password reset link."
                    })
                });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString("hex");
            const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

            await userDB.updateOne(
                { _id: user._id },
                { $set: { resetPasswordToken: resetToken, resetPasswordExpires } }
            );

            const resetUrl = `${config.mail_reset_url}${resetToken}`; // Adjust frontend URL as needed

            const message = `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
            Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:\n\n
            ${resetUrl}\n\n
            If you did not request this, please ignore this email and your password will remain unchanged.\n`;

            await sendEmail(user.email, "Password Reset Request", message);

            return res.json({
                data: encrypt({
                    success: true,
                    message: "If an account with that email exists, we have sent a password reset link."
                })
            });
        } catch (error) {
            logger.error(`[FrontendAuthController:forgotPassword] Error occurred:`, error);
            return res.status(500).json({
                data: encrypt({ success: false, message: "Internal server error" })
            });
        }
    }

    @Post("/reset-password")
    async resetPassword(@Body() body: any, @Res() res: Response) {
        try {
            const { token, newPassword } = decrypt(body.data);
            if (!token || !newPassword) {
                return res.status(400).json({
                    data: encrypt({ success: false, message: "Token and new password are required" })
                });
            }

            const userDB = new QueryBuilder<User>("users");
            const user = await userDB.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: new Date() },
                isDeleted: { $ne: true }
            });

            if (!user) {
                return res.status(400).json({
                    data: encrypt({ success: false, message: "Password reset token is invalid or has expired" })
                });
            }

            const hashedPassword = await hashPassword(newPassword);

            await userDB.updateOne(
                { _id: user._id },
                {
                    $set: { password: hashedPassword, updatedAt: new Date() },
                    $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 }
                }
            );

            return res.json({
                data: encrypt({
                    success: true,
                    message: "Password has been successfully reset"
                })
            });
        } catch (error) {
            logger.error(`[FrontendAuthController:resetPassword] Error occurred:`, error);
            return res.status(500).json({
                data: encrypt({ success: false, message: "Internal server error" })
            });
        }
    }
}
