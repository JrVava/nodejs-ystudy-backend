import { ObjectId } from "mongodb";

export interface StudyRoute {
    _id?: ObjectId;
    title: string;
    description: string;
    slug: string;
    link: string;
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

