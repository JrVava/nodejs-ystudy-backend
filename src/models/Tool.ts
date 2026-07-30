import { ObjectId } from "mongodb";

export interface Tool {
    _id?: ObjectId;
    image: ObjectId;
    title: string;
    description: string;
    time: string;
    link: string;
    mode: "paid" | "free";
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
