import { ObjectId } from "mongodb";

export interface Qualification {
    _id?: ObjectId;
    title: string;
    badge?: string;
    description?: string;
    image?: ObjectId | null;
    tags?: string[];
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
