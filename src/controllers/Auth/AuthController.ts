import { JsonController, Post, Body, Res } from "routing-controllers";
import { Response } from "express";
import { comparePassword } from "../../utils/hash";
import { getDB } from "../../database/mongo";
import { generateToken } from "../../utils/jwt";
import { decrypt, encrypt } from "../../utils/crypto";

@JsonController("/auth")
export class AuthController {

    @Post("/login")
    async login(@Body() body: any, @Res() res: Response) {
        try {
            const { email, password } = decrypt(body.data);
            if (!email || !password) {
                return res.status(400).json({
                    message: "Email and password are required",
                });
            }

            const db = getDB();

            const user = await db.collection("users").findOne({ email });

            if (!user) {
                return res.status(400).json({
                    message: "User not found",
                });
            }

            const isMatch = await comparePassword(password, user.password);

            if (!isMatch) {
                return res.status(400).json({
                    message: "Invalid password",
                });
            }

            // ✅ Better JWT payload (future ready)
            const token = generateToken({
                id: user._id,
                role: user.role,
                email: user.email,
            });

            return res.json({
                data: encrypt({
                    message: "Login successful",
                    token,
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                    },
                }),
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Something went wrong",
            });
        }
    }
}