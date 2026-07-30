import { ObjectId } from "mongodb";

export interface StudentStory {
    _id?: ObjectId;
    badge?: string;
    star: number;
    description: string;
    name: string;
    age?: number;
    subject?: string;
    year?: string;
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
