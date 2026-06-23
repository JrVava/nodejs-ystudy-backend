import { ObjectId } from "mongodb";

export interface Navigation {
    _id?: ObjectId;
    slug: string;
    pageName: string;
    componentName: string;
    parentId: ObjectId | null;
    position: number;
    createdAt: Date;
    updatedAt: Date;
}
