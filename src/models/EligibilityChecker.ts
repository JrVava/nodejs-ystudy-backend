import { ObjectId } from "mongodb";

export type EligibilityCheckerStatus = 'Under process' | 'completed' | 'reviwed' | 'reviewed' | 'pending' | 'failed';

export interface EligibilityChecker {
    _id?: ObjectId;
    residencyStatus?: string;
    studiedBefore?: string;
    study?: string;
    household?: string;
    firstName?: string;
    email?: string;
    phone?: string;
    bestTimeToCall?: string;
    is_agree?: boolean;
    isNotificationSend?: boolean;
    status?: EligibilityCheckerStatus;
    isNotificationSendToAdmin?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
