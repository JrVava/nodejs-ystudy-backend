import { ObjectId } from "mongodb";

export type DegreeMatchStatus = 'Under process' | 'completed' | 'reviwed' | 'reviewed' | 'pending' | 'failed';

export interface DegreeMatch {
    _id?: ObjectId;
    residencyStatus?: string;
    highestQualification?: string;
    subjectsInterest?: string;
    study?: string;
    salaryLevel?: string;
    situation?: string;
    ageRange?: string;
    languageConfident?: string;
    HouseholdIncome?: string;
    career?: string;
    responsibilities?: string;
    firstName?: string;
    email?: string;
    phone?: string;
    bestTimeToCall?: string;
    status?: DegreeMatchStatus;
    is_agree?: boolean
    is_notification_send?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
