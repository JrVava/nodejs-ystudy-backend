import jwt from "jsonwebtoken";
import { config } from "../config";

const SECRET = config.jwt_secret as string;

export const generateToken = (payload: any) => {
  return jwt.sign(payload, SECRET, { expiresIn: "1d" });
};