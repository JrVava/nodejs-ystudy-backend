import { ObjectId } from "mongodb";

export interface UpcomingIntake {
    _id?: ObjectId;
    year: string;
    month: string;
    subjectId: ObjectId | null;
    qualificationId: ObjectId | null;
    link: string;
    status?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
