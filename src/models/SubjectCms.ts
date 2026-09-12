import { ObjectId } from "mongodb";

export interface SubjectCms {
    _id?: ObjectId;
    subjectId: ObjectId;

    section_2?: {
        badge?: string;
        title?: string;
        description?: string;
        status?: boolean;
    };

    section_3?: {
        badge?: string;
        title?: string;
        description?: string;
        cards?: any[];
        status?: boolean;
    };

    section_4?: {
        badge?: string;
        title?: string;
        cards?: any[];
        status?: boolean;
    };

    section_5?: {
        badge?: string;
        title?: string;
        description?: string;
        cards?: any[];
        status?: boolean;
    };

    section_6?: {
        cards?: any[];
        status?: boolean;
    };

    section_7?: {
        badge?: string;
        title?: string;
        status?: boolean;
    };

    section_8?: {
        badge?: string;
        title?: string;
        status?: boolean;
    };

    section_9?: {
        title?: string;
        description?: string;
        status?: boolean;
    };

    section_10?: {
        cards?: any[];
        status?: boolean;
    };

    section_11?: {
        title?: string;
        description?: string;
        cards?: any[];
        status?: boolean;
    };

    createdAt?: Date;
    updatedAt?: Date;
    isDeleted?: boolean;
}
