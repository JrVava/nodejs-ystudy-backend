import { ObjectId } from "mongodb";

export interface FormSendEmailToUser {
    _id?: ObjectId;
    formName: string;
    sendEmail: boolean;
    sendEmailToAdmin: boolean;
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
