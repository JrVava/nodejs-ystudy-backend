import { ObjectId } from "mongodb";

export interface ApplicationForm {
    _id?: ObjectId;
    formData: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}
