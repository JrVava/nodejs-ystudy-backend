import { ObjectId } from "mongodb";

export interface TimeTable {
    _id?: ObjectId;
    badge?: string;
    title: string;
    description?: string;
    slug: string;
    items: {
        type: string;
        mode: string;
    }[];
    isDeleted?: boolean;
    status?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
