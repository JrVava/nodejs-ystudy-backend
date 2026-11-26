import { ObjectId } from "mongodb";

export type BecomeAnAdviserStatus = 'Under process' | 'completed' | 'reviwed' | 'reviewed' | 'pending' | 'failed';

export interface BecomeAnAdviser {
    _id?: ObjectId;
    fullName?: string;
    email?: string;
    phone?: string;
    bestDescription?: string;
    audienceEnquiry?: string;
    status?: BecomeAnAdviserStatus;
    isNotificationSend?: boolean;
    isNotificationSendToAdmin?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
