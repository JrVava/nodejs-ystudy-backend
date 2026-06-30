import { ObjectId } from "mongodb";

export interface Course {
    _id?: ObjectId;
    image?: ObjectId | string | null;
    title: string;
    shortDescription?: string;
    longDescription?: string;
    badges?: string[];
    salaryRange?: {
        from?: number;
        to?: number;
    };
    careerOutcomeBadge?: string;
    availableCourses?: ObjectId[] | null;
    relatedCourses?: ObjectId[] | null;
    createdAt: Date;
    updatedAt: Date;
}
