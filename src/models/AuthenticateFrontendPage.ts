import { ObjectId } from "mongodb";

export interface AuthenticateFrontendPage {
    _id?: ObjectId;
    slug: string;
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
