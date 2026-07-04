import { ObjectId } from "mongodb";

export interface Location {
    _id?: ObjectId;
    title: string;
    slug: string;
    short_description: string;
    long_description: string;
    image?: ObjectId | null; // ObjectId of media collection
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
