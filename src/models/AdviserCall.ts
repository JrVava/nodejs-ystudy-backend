import { ObjectId } from "mongodb";

export type AdviserCallStatus = 'Under process' | 'completed' | 'reviwed' | 'reviewed' | 'pending' | 'failed';

export interface AdviserCall {
    _id?: ObjectId;
    name?: string;
    email?: string;
    phone?: string;
    contactMethod?: string;
    topic?: string;
    preferredDay?: string;
    preferredTimeSlot?: string;
    discuss?: string;
    is_agree?: boolean;
    status?: AdviserCallStatus;
    isNotificationSend?: boolean;
    isNotificationSendToAdmin?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
