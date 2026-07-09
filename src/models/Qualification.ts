import { ObjectId } from "mongodb";

export interface Qualification {
    _id?: ObjectId;
    title: string;
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
