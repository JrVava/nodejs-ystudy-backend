import { ObjectId } from "mongodb";

export type PartnerFormStatus = 'Under process' | 'completed' | 'reviwed' | 'reviewed' | 'pending' | 'failed';

export type PartnerFormModule = 'becomeAnAdviser' | 'influencers' | 'affiliatePartners' | 'business' | 'referAFriend' | string;

export interface PartnerForm {
    _id?: ObjectId;
    module?: PartnerFormModule;
    fullName?: string;
    email?: string;
    phone?: string;
    bestDescription?: string;
    audienceEnquiry?: string;
    status?: PartnerFormStatus;
    isNotificationSend?: boolean;
    isNotificationSendToAdmin?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

// Deprecation aliases for backwards compatibility
export type BecomeAnAdviserStatus = PartnerFormStatus;
export type BecomeAnAdviserModule = PartnerFormModule;
export type BecomeAnAdviser = PartnerForm;
