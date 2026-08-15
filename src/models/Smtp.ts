import { ObjectId } from "mongodb";

export interface Smtp {
    _id?: ObjectId;
    host: string;
    port: number;
    user: string;
    password?: string;
    secure?: boolean;
    fromEmail?: string;
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
