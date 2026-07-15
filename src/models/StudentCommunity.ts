import { ObjectId } from "mongodb";

export interface StudentCommunity {
    _id?: ObjectId;
    image: string | ObjectId;
    description: string;
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
