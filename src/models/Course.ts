import { ObjectId } from "mongodb";

export interface Course {
    _id?: ObjectId;
    image?: ObjectId | string | null;
    title: string;
    slug: string;
    shortDescription?: string;
    longDescription?: string;
    courseType: 'General' | 'Social';
    badges?: string[];
    entryRequirement?: string[];
    modeType?: ObjectId[] | null;
    salaryRange?: {
        from?: number;
        to?: number;
    };
    careerOutcomeBadge?: string;
    availableCourses?: ObjectId[] | null;
    locations?: ObjectId[] | null;
    relatedCourses?: ObjectId[] | null;
    isDeleted?: boolean;
    status?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
