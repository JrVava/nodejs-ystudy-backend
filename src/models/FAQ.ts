import { ObjectId } from "mongodb";

export interface FAQ {
    _id?: ObjectId;
    slug: string;
    question: string;
    answer: string;
    status?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
