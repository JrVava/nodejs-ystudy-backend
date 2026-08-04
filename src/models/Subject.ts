import { ObjectId } from "mongodb";

export interface Subject {
    _id?: ObjectId;
    title: string;
    badge?: string;
    description?: string;
    image?: ObjectId | null;
    tags?: string[];
    salary?: string;
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
