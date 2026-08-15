import { ObjectId } from "mongodb";

export interface User {
    _id?: ObjectId;
    name: string;
    email: string;
    password?: string;
    role: "admin" | "user"; // 'admin' for backend/admin users, 'user' for frontend users
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
