import { ObjectId } from "mongodb";

export interface Guide {
    _id?: ObjectId;
    title: string;
    subTitle?: string;
    description?: string;
    badge?: string;
    read_time?: string;
    icon?: string;
    link?: string;
    image?: string | ObjectId | null;
    status: boolean;
    isDeleted?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
