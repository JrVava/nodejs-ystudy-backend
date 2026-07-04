import { ObjectId } from "mongodb";

export interface Navigation {
    _id?: ObjectId;
    slug: string;
    pageName: string;
    componentName: string;
    parentId: ObjectId | null;
    position: number;
    isDeleted?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
