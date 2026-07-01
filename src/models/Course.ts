import { ObjectId } from "mongodb";

export interface Course {
    _id?: ObjectId;
    image?: ObjectId | string | null;
    title: string;
    slug: string;
    shortDescription?: string;
    longDescription?: string;
    badges?: string[];
    salaryRange?: {
        from?: number;
        to?: number;
    };
    careerOutcomeBadge?: string;
    availableCourses?: ObjectId[] | null;
    locations?: ObjectId[] | null;
    relatedCourses?: ObjectId[] | null;
    status?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
