import { ObjectId } from "mongodb";

export interface Funding {
    _id?: ObjectId;
    title: string;
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
